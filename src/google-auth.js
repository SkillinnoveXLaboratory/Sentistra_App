import Constants from "expo-constants";

const webClientId = Constants.expoConfig?.extra?.googleWebClientId;

function isExpoGo() {
  return Constants.appOwnership === "expo" || Constants.executionEnvironment === "storeClient";
}

function getNativeGoogleServices() {
  if (isExpoGo()) {
    throw new Error("Google sign-in requires the Sentistra development build, not Expo Go.");
  }
  if (!webClientId) {
    throw new Error("Google sign-in is not configured for this app build.");
  }

  // Native modules must be loaded only in a custom build so Expo Go can still run email authentication.
  const firebaseAuthModule = require("@react-native-firebase/auth");
  const googleSigninModule = require("@react-native-google-signin/google-signin");
  const auth = firebaseAuthModule.default || firebaseAuthModule;
  const { GoogleSignin } = googleSigninModule;
  GoogleSignin.configure({ webClientId });
  return { auth, GoogleSignin };
}

export async function getGoogleFirebaseIdToken() {
  const { auth, GoogleSignin } = getNativeGoogleServices();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (response.type === "cancelled") return null;

  const googleIdToken = response.data?.idToken;
  if (!googleIdToken) throw new Error("Google did not return an ID token.");

  const credential = auth.GoogleAuthProvider.credential(googleIdToken);
  const firebaseCredential = await auth().signInWithCredential(credential);
  return firebaseCredential.user.getIdToken(true);
}

export async function signOutGoogle() {
  if (isExpoGo()) return;

  const { auth, GoogleSignin } = getNativeGoogleServices();
  await Promise.allSettled([auth().signOut(), GoogleSignin.signOut()]);
}

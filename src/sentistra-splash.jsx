import { useEffect, useEffectEvent, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { PlayfairDisplay_500Medium_Italic } from "@expo-google-fonts/playfair-display/500Medium_Italic";

const LOGO = require("../assets/images/app_icon.png");

export function SentistraSplash({ onComplete, onReady }) {
  const [fontsLoaded, fontError] = useFonts({ PlayfairDisplay_500Medium_Italic });
  const [logoProgress] = useState(() => new Animated.Value(0));
  const [titleProgress] = useState(() => new Animated.Value(0));
  const [subtitleProgress] = useState(() => new Animated.Value(0));
  const finishLaunch = useEffectEvent(() => onComplete());

  useEffect(() => {
    if (!fontsLoaded && !fontError) return undefined;

    const reveal = Animated.sequence([
      Animated.spring(logoProgress, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(titleProgress, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(subtitleProgress, { toValue: 1, duration: 520, delay: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]);
    reveal.start();
    const timer = setTimeout(() => finishLaunch(), 2600);
    return () => {
      reveal.stop();
      clearTimeout(timer);
    };
  }, [fontError, fontsLoaded, logoProgress, subtitleProgress, titleProgress]);

  const logoScale = logoProgress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const titleTranslateX = titleProgress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] });
  const subtitleTranslateY = subtitleProgress.interpolate({ inputRange: [0, 1], outputRange: [15, 0] });

  return (
    <View style={styles.screen} onLayout={onReady}>
      <View style={styles.brand}>
        <Animated.View style={[styles.logoWrap, { opacity: logoProgress, transform: [{ scale: logoScale }] }]}>
          <Image source={LOGO} resizeMode="contain" style={styles.logo} />
        </Animated.View>
        <Animated.View style={[styles.titleWrap, { opacity: titleProgress, transform: [{ translateX: titleTranslateX }] }]}>
          <Text style={[styles.title, fontsLoaded && styles.titleFont]}>Sentistra</Text>
        </Animated.View>
        <Animated.View style={{ opacity: subtitleProgress, transform: [{ translateY: subtitleTranslateY }] }}>
          <Text style={styles.subtitle}>Intelligent writing, naturally refined.</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  brand: { width: "100%", alignItems: "center", paddingHorizontal: 28 },
  logoWrap: {
    width: 88,
    height: 88,
    marginBottom: 18,
  },
  logo: { width: "100%", height: "100%" },
  titleWrap: { overflow: "hidden" },
  title: { color: "#1A1A1A", fontSize: 35, fontWeight: "500", letterSpacing: -0.8, textAlign: "center" },
  titleFont: { fontFamily: "PlayfairDisplay_500Medium_Italic" },
  subtitle: { marginTop: 12, color: "#666666", fontSize: 14, fontWeight: "400", textAlign: "center" },
});

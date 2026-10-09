import { useEffect, useEffectEvent, useState } from "react";
import { Animated, Easing, Image, StatusBar, StyleSheet, Text, View } from "react-native";

const LOGO = require("../assets/images/app_icon.png");

export function SentistraSplash({ onComplete, onReady }) {
  const [logoProgress] = useState(() => new Animated.Value(0));
  const [titleProgress] = useState(() => new Animated.Value(0));
  const [subtitleProgress] = useState(() => new Animated.Value(0));
  const finishLaunch = useEffectEvent(() => onComplete());

  useEffect(() => {
    const reveal = Animated.parallel([
      Animated.timing(logoProgress, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(titleProgress, { toValue: 1, duration: 620, delay: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(subtitleProgress, { toValue: 1, duration: 520, delay: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    reveal.start();
    const timer = setTimeout(() => finishLaunch(), 2600);
    return () => {
      reveal.stop();
      clearTimeout(timer);
    };
  }, [logoProgress, subtitleProgress, titleProgress]);

  return (
    <View style={styles.screen} onLayout={onReady}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" hidden={false} translucent={false} />
      <View style={styles.brand}>
        <Animated.View style={[styles.logoWrap, { opacity: logoProgress }]}>
          <Image source={LOGO} resizeMode="contain" style={styles.logo} />
        </Animated.View>
        <Animated.View style={[styles.titleWrap, { opacity: titleProgress }]}>
          <Text style={styles.title}>Sentistra</Text>
        </Animated.View>
        <Animated.View style={{ opacity: subtitleProgress }}>
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
    width: 124,
    height: 124,
    marginBottom: 18,
  },
  logo: { width: "100%", height: "100%" },
  titleWrap: { overflow: "hidden" },
  title: { color: "#111827", fontSize: 34, fontWeight: "800", letterSpacing: -0.6, textAlign: "center" },
  subtitle: { marginTop: 12, color: "#666666", fontSize: 14, fontWeight: "400", textAlign: "center" },
});

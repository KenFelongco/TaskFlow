import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line } from 'react-native-svg';

interface LoadingScreenProps {
  onFinish: () => void;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onFinish }) => {
  // Pure white flash transition overlay (blooms to 100% white, then dissolves to reveal login)
  const whiteFlashOpacity = useRef(new Animated.Value(0)).current;
  // Intro screen content opacity (hidden cleanly when flash reaches 100% white to eliminate box glitches)
  const contentFade = useRef(new Animated.Value(1)).current;

  // Background ambient navy glow pulse
  const ambientPulse = useRef(new Animated.Value(0.65)).current;

  // Phase 1: Electric Perimeter Outline & Squircle Emergence
  const electricGlow = useRef(new Animated.Value(0)).current;
  const electricScale = useRef(new Animated.Value(0.55)).current;
  const cardScale = useRef(new Animated.Value(0.5)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // Phase 2: Volumetric Radial Light Burst (Frame 00:02)
  const radialRaysScale = useRef(new Animated.Value(0.5)).current;
  const radialRaysOpacity = useRef(new Animated.Value(0)).current;
  const radialRaysRotate = useRef(new Animated.Value(0)).current;

  // Phase 3: Staggered Chevron Drops (Frames 00:03 - 00:05)
  // Tier 1: Bottom navy chevron
  const tier1Y = useRef(new Animated.Value(-75)).current;
  const tier1Opacity = useRef(new Animated.Value(0)).current;
  const tier1Scale = useRef(new Animated.Value(1.2)).current;

  // Tier 2: Mid-bottom cobalt chevron
  const tier2Y = useRef(new Animated.Value(-85)).current;
  const tier2Opacity = useRef(new Animated.Value(0)).current;
  const tier2Scale = useRef(new Animated.Value(1.2)).current;

  // Tier 3: Mid-top azure chevron
  const tier3Y = useRef(new Animated.Value(-95)).current;
  const tier3Opacity = useRef(new Animated.Value(0)).current;
  const tier3Scale = useRef(new Animated.Value(1.2)).current;

  // Tier 4: Top gradient checkmark arrow
  const checkmarkY = useRef(new Animated.Value(-150)).current;
  const checkmarkOpacity = useRef(new Animated.Value(0)).current;
  const checkmarkScale = useRef(new Animated.Value(1.4)).current;

  // Phase 4: Floating Energy Sparkles (Frame 00:05)
  const spark1Y = useRef(new Animated.Value(20)).current;
  const spark1Opacity = useRef(new Animated.Value(0)).current;
  const spark2Y = useRef(new Animated.Value(25)).current;
  const spark2Opacity = useRef(new Animated.Value(0)).current;
  const spark3Y = useRef(new Animated.Value(18)).current;
  const spark3Opacity = useRef(new Animated.Value(0)).current;

  // Phase 5: 4-Point Star Lens Flare Gleam (Frame 00:06)
  const lensFlareScale = useRef(new Animated.Value(0)).current;
  const lensFlareOpacity = useRef(new Animated.Value(0)).current;
  const lensFlareRotate = useRef(new Animated.Value(0)).current;
  const shimmerX = useRef(new Animated.Value(-90)).current;
  const shimmerOpacity = useRef(new Animated.Value(0)).current;

  // Phase 6: Master 3D Depth Icon Crossfade (Frames 00:07 - 00:09)
  const masterIconOpacity = useRef(new Animated.Value(0)).current;

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasFinishedRef = useRef(false);

  const handleFinish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    // Clear all scheduled intro timers
    timeoutsRef.current.forEach(clearTimeout);

    // Stage 1: Radiant full-screen white bloom + subtle icon expansion into light
    Animated.parallel([
      Animated.timing(whiteFlashOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 1.15,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Stage 2: Intro elements behind the white flash are hidden (no box glitch possible)
      contentFade.setValue(0);

      // Stage 3: Smoothly dissolve the pure white flash to unveil the pre-mounted AuthScreen
      Animated.timing(whiteFlashOpacity, {
        toValue: 0,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    });
  };

  useEffect(() => {
    // --- AMBIENT PULSE (Continuous breathing) ---
    Animated.loop(
      Animated.sequence([
        Animated.timing(ambientPulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ambientPulse, {
          toValue: 0.65,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // --- PHASE 1: Electric Outline & Squircle Emergence (0.0s - 0.7s) ---
    Animated.parallel([
      Animated.timing(electricGlow, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(electricScale, {
        toValue: 1,
        friction: 5.5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start();

    const addTimer = (cb: () => void, ms: number) => {
      const id = setTimeout(cb, ms);
      timeoutsRef.current.push(id);
      return id;
    };

    // --- PHASE 2: Volumetric Radial Light Burst (0.8s - 1.6s, matching 00:02) ---
    addTimer(() => {
      Animated.parallel([
        Animated.timing(radialRaysScale, {
          toValue: 1.45,
          duration: 750,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(radialRaysRotate, {
          toValue: 1,
          duration: 850,
          easing: Easing.out(Easing.linear),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(radialRaysOpacity, {
            toValue: 0.95,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(radialRaysOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, 800);

    // --- PHASE 3: 4-Tier Staggered Chevron Drops (1.5s - 3.4s, matching 00:03 - 00:05) ---
    // Tier 1: Bottom royal navy chevron lands at 1.5s
    addTimer(() => {
      Animated.parallel([
        Animated.timing(tier1Opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(tier1Y, { toValue: 0, friction: 4.8, tension: 80, useNativeDriver: true }),
        Animated.spring(tier1Scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]).start();
    }, 1500);

    // Tier 2: Mid-bottom cobalt chevron lands at 2.1s
    addTimer(() => {
      Animated.parallel([
        Animated.timing(tier2Opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(tier2Y, { toValue: 0, friction: 4.8, tension: 80, useNativeDriver: true }),
        Animated.spring(tier2Scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]).start();
    }, 2100);

    // Tier 3: Mid-top azure cyan chevron lands at 2.7s
    addTimer(() => {
      Animated.parallel([
        Animated.timing(tier3Opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(tier3Y, { toValue: 0, friction: 4.8, tension: 85, useNativeDriver: true }),
        Animated.spring(tier3Scale, { toValue: 1, friction: 5, tension: 85, useNativeDriver: true }),
      ]).start();
    }, 2700);

    // Tier 4: Top Checkmark Arrow swoops down from above at 3.3s with impact punch
    addTimer(() => {
      Animated.parallel([
        Animated.timing(checkmarkOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(checkmarkY, { toValue: 0, friction: 4.2, tension: 90, useNativeDriver: true }),
        Animated.spring(checkmarkScale, { toValue: 1, friction: 4.2, tension: 90, useNativeDriver: true }),
        // Squircle card micro-impact punch
        Animated.sequence([
          Animated.spring(cardScale, { toValue: 0.96, friction: 3, tension: 120, useNativeDriver: true }),
          Animated.spring(cardScale, { toValue: 1.0, friction: 4, tension: 80, useNativeDriver: true }),
        ]),
      ]).start();
    }, 3300);

    // --- PHASE 4: Floating Ambient Energy Sparkles (3.4s - 4.8s, matching 00:05) ---
    addTimer(() => {
      const animateSpark = (animY: Animated.Value, animOp: Animated.Value, distance: number, delay: number) => {
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(animOp, { toValue: 0.9, duration: 250, useNativeDriver: true }),
            Animated.timing(animY, { toValue: -distance, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          ]),
          Animated.timing(animOp, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      };
      animateSpark(spark1Y, spark1Opacity, 40, 0);
      animateSpark(spark2Y, spark2Opacity, 50, 150);
      animateSpark(spark3Y, spark3Opacity, 35, 300);
    }, 3400);

    // --- PHASE 5: 4-Point Star Lens Flare Gleam & Shimmer Sweep (3.9s - 4.7s, matching 00:06) ---
    addTimer(() => {
      Animated.parallel([
        // 4-Point Star Flare
        Animated.sequence([
          Animated.parallel([
            Animated.timing(lensFlareOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
            Animated.spring(lensFlareScale, { toValue: 1.25, friction: 4, tension: 90, useNativeDriver: true }),
            Animated.timing(lensFlareRotate, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          ]),
          Animated.timing(lensFlareOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        // Specular shimmer sweep across checkmark
        Animated.sequence([
          Animated.parallel([
            Animated.timing(shimmerOpacity, { toValue: 0.95, duration: 150, useNativeDriver: true }),
            Animated.timing(shimmerX, {
              toValue: 90,
              duration: 700,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(shimmerOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
      ]).start();
    }, 3900);

    // --- PHASE 6: Master 3D Depth Icon Crossfade (4.2s - 4.8s, matching 00:07) ---
    addTimer(() => {
      Animated.timing(masterIconOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }, 4200);

    // --- PHASE 7: Settle & Full White Flash Transition to App (5.5s) ---
    addTimer(() => {
      handleFinish();
    }, 5500);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const raysRotation = radialRaysRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '25deg'],
  });

  const flareRotation = lensFlareRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  // Pre-generate 16 radial light beam rays (emanating 360 degrees)
  const RAY_COUNT = 16;
  const radialRays = Array.from({ length: RAY_COUNT }).map((_, i) => {
    const angle = (i * (360 / RAY_COUNT) * Math.PI) / 180;
    const rInner = 75;
    const rOuter = 165;
    const x1 = 180 + rInner * Math.cos(angle);
    const y1 = 180 + rInner * Math.sin(angle);
    const x2 = 180 + rOuter * Math.cos(angle);
    const y2 = 180 + rOuter * Math.sin(angle);
    return { id: i, x1, y1, x2, y2 };
  });

  return (
    <View style={styles.wrapper}>
      {/* Intro Stage Content (Smoothly hidden behind the white flash at peak brilliance) */}
      <Animated.View
        style={[
          styles.container,
          {
            opacity: contentFade,
          },
        ]}
      >
      {/* Background Cinematic Radial Ambient Glow */}
      <Animated.View
        style={[
          styles.ambientGlow,
          {
            opacity: ambientPulse,
          },
        ]}
      />

      {/* Top Header Controls: Live Engine Badge & Skip Button */}
      <View style={styles.topBar}>
        <View style={styles.engineBadge}>
          <View style={styles.enginePulse} />
          <Text style={styles.engineBadgeText}>TASKFLOW 2026</Text>
        </View>

        <TouchableOpacity style={styles.skipBtn} onPress={handleFinish} activeOpacity={0.75}>
          <Text style={styles.skipBtnText}>Skip ➔</Text>
        </TouchableOpacity>
      </View>

      {/* Center Stage: Recreating Intro.mp4 with 100% Frame-by-Frame Native Precision */}
      <View style={styles.stageWrap}>
        <View style={styles.iconBox}>
          {/* Volumetric Radial Light Rays Burst (Frame 00:02) */}
          <Animated.View
            style={[
              styles.radialRaysWrap,
              {
                transform: [{ scale: radialRaysScale }, { rotate: raysRotation }],
                opacity: radialRaysOpacity,
              },
            ]}
          >
            <Svg width="360" height="360" viewBox="0 0 360 360">
              <Defs>
                <LinearGradient id="rayGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                  <Stop offset="50%" stopColor="#38BDF8" stopOpacity="0.6" />
                  <Stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
                </LinearGradient>
              </Defs>
              {radialRays.map((r) => (
                <Line
                  key={r.id}
                  x1={r.x1}
                  y1={r.y1}
                  x2={r.x2}
                  y2={r.y2}
                  stroke="url(#rayGrad)"
                  strokeWidth={r.id % 2 === 0 ? '5' : '3'}
                  strokeLinecap="round"
                />
              ))}
            </Svg>
          </Animated.View>

          {/* Electric Perimeter Outline Glow (Concentric around squircle, Frames 00:00 - 00:01) */}
          <Animated.View
            style={[
              styles.electricOutline,
              {
                opacity: electricGlow,
                transform: [{ scale: electricScale }],
              },
            ]}
          />

          {/* Floating Energy Sparkles (Frame 00:05) */}
          <Animated.View
            style={[
              styles.sparkleDot,
              {
                left: -15,
                top: 40,
                opacity: spark1Opacity,
                transform: [{ translateY: spark1Y }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.sparkleDot,
              {
                right: -12,
                top: 30,
                width: 7,
                height: 7,
                opacity: spark2Opacity,
                transform: [{ translateY: spark2Y }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.sparkleDot,
              {
                left: 10,
                top: -15,
                width: 5,
                height: 5,
                opacity: spark3Opacity,
                transform: [{ translateY: spark3Y }],
              },
            ]}
          />

          {/* White Squircle Card Container */}
          <Animated.View
            style={[
              styles.squircleCard,
              {
                opacity: cardOpacity,
                transform: [{ scale: cardScale }],
              },
            ]}
          >
            {/* Staggered Animated Vector Glyphs Assembly (Exact Geometry matching icon.png) */}
            <View style={styles.svgContainer}>
              {/* Tier 1: Bottom Royal Navy Chevron Arc with central notch */}
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    opacity: tier1Opacity,
                    transform: [{ translateY: tier1Y }, { scale: tier1Scale }],
                  },
                ]}
              >
                <Svg width="128" height="128" viewBox="0 0 128 128">
                  <Defs>
                    <LinearGradient id="bar1Grad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0%" stopColor="#1E3A8A" />
                      <Stop offset="50%" stopColor="#1E40AF" />
                      <Stop offset="100%" stopColor="#2563EB" />
                    </LinearGradient>
                  </Defs>
                  <Path
                    d="M 38,97 L 64,105 L 90,97"
                    stroke="url(#bar1Grad)"
                    strokeWidth="12.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              </Animated.View>

              {/* Tier 2: Mid-Bottom Cobalt Chevron Arc */}
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    opacity: tier2Opacity,
                    transform: [{ translateY: tier2Y }, { scale: tier2Scale }],
                  },
                ]}
              >
                <Svg width="128" height="128" viewBox="0 0 128 128">
                  <Defs>
                    <LinearGradient id="bar2Grad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0%" stopColor="#1D4ED8" />
                      <Stop offset="50%" stopColor="#2563EB" />
                      <Stop offset="100%" stopColor="#3B82F6" />
                    </LinearGradient>
                  </Defs>
                  <Path
                    d="M 38,81 L 64,89 L 90,81"
                    stroke="url(#bar2Grad)"
                    strokeWidth="12.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              </Animated.View>

              {/* Tier 3: Mid-Top Azure Cyan Chevron Arc */}
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    opacity: tier3Opacity,
                    transform: [{ translateY: tier3Y }, { scale: tier3Scale }],
                  },
                ]}
              >
                <Svg width="128" height="128" viewBox="0 0 128 128">
                  <Defs>
                    <LinearGradient id="bar3Grad" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0%" stopColor="#0284C7" />
                      <Stop offset="50%" stopColor="#00B4D8" />
                      <Stop offset="100%" stopColor="#38BDF8" />
                    </LinearGradient>
                  </Defs>
                  <Path
                    d="M 38,65 L 64,73 L 90,65"
                    stroke="url(#bar3Grad)"
                    strokeWidth="12.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              </Animated.View>

              {/* Tier 4: Top Bold Gradient Checkmark Arrow */}
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    opacity: checkmarkOpacity,
                    transform: [{ translateY: checkmarkY }, { scale: checkmarkScale }],
                  },
                ]}
              >
                <Svg width="128" height="128" viewBox="0 0 128 128">
                  <Defs>
                    <LinearGradient id="checkGrad" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0%" stopColor="#00B4D8" />
                      <Stop offset="50%" stopColor="#2563EB" />
                      <Stop offset="100%" stopColor="#1E40AF" />
                    </LinearGradient>
                  </Defs>
                  <Path
                    d="M 36,40 L 58,62 L 92,28"
                    stroke="url(#checkGrad)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </Svg>
              </Animated.View>

              {/* Specular Shimmer Sheen Glint across checkmark */}
              <Animated.View
                style={[
                  styles.shimmerSheen,
                  {
                    opacity: shimmerOpacity,
                    transform: [{ translateX: shimmerX }, { rotate: '25deg' }],
                  },
                ]}
              />

              {/* 4-Point Star Lens Flare Gleam at Checkmark Vertex (Frame 00:06) */}
              <Animated.View
                style={[
                  styles.lensFlareWrap,
                  {
                    opacity: lensFlareOpacity,
                    transform: [{ scale: lensFlareScale }, { rotate: flareRotation }],
                  },
                ]}
              >
                <Svg width="36" height="36" viewBox="0 0 36 36">
                  {/* Central Diamond Core */}
                  <Path
                    d="M 18,2 Q 18,18 2,18 Q 18,18 18,34 Q 18,18 34,18 Q 18,18 18,2 Z"
                    fill="#FFFFFF"
                  />
                  {/* Diagonal Subtle Cross */}
                  <Path
                    d="M 18,8 Q 18,18 8,18 Q 18,18 18,28 Q 18,18 28,18 Q 18,18 18,8 Z"
                    fill="#E0F2FE"
                    opacity="0.8"
                  />
                </Svg>
              </Animated.View>
            </View>

            {/* Master 3D Depth Icon Overlay (Crossfades seamlessly to complete ray-traced depth) */}
            <Animated.Image
              source={require('../../assets/icon.png')}
              style={[styles.masterIconOverlay, { opacity: masterIconOpacity }]}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Clean Cinematic Brand Typography with Generous Spacing */}
        <Text style={styles.brandTitle}>TaskFlow</Text>
        <Text style={styles.brandSubtitle}>Collaborative Workspace</Text>
      </View>

      {/* Footer Attribution */}
      <View style={styles.footerNote}>
        <Text style={styles.footerNoteText}>High-Performance Local SQLite & Live WebSockets</Text>
      </View>
    </Animated.View>

    {/* Full Screen Pure White Flash Overlay (Engulfs screen and dissolves into Login) */}
    <Animated.View
      pointerEvents="none"
      style={[
        styles.whiteFlash,
        {
          opacity: whiteFlashOpacity,
        },
      ]}
    />
  </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999999,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050811',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  whiteFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 1000000,
  },
  ambientGlow: {
    position: 'absolute',
    top: '25%',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 70,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  enginePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00B4D8',
    marginRight: 7,
  },
  engineBadgeText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  skipBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stageWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 380,
  },
  iconBox: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  radialRaysWrap: {
    position: 'absolute',
    width: 360,
    height: 360,
    alignItems: 'center',
    justifyContent: 'center',
  },
  electricOutline: {
    position: 'absolute',
    width: 154,
    height: 154,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: '#38BDF8',
    shadowColor: '#00B4D8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 26,
    elevation: 16,
  },
  sparkleDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
    shadowColor: '#00B4D8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 8,
  },
  squircleCard: {
    width: 144,
    height: 144,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 20,
    overflow: 'hidden',
  },
  svgContainer: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shimmerSheen: {
    position: 'absolute',
    top: 15,
    width: 22,
    height: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 11,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 10,
  },
  lensFlareWrap: {
    position: 'absolute',
    left: 42,
    top: 48,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 12,
  },
  masterIconOverlay: {
    position: 'absolute',
    width: 144,
    height: 144,
    borderRadius: 38,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  footerNote: {
    alignItems: 'center',
  },
  footerNoteText: {
    fontSize: 11,
    color: 'rgba(148, 163, 184, 0.45)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

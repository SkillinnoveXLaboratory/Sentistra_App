import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alert,
  Animated,
  BackHandler,
  Easing,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useFonts } from "expo-font";
import * as Clipboard from "expo-clipboard";
import * as Speech from "expo-speech";
import { File } from "expo-file-system";
import { PlayfairDisplay_500Medium_Italic } from "@expo-google-fonts/playfair-display";
import { SafeAreaView } from "react-native-safe-area-context";
import { Line, Path, Svg, Text as SvgText } from "react-native-svg";
import { useAuth } from "../src/auth-context";
import { submitHumanizeRequest } from "../src/humanize-api";
import { cancelDocumentHumanize, getDocumentHumanizeStatus, getStoredDocuments, saveDocumentToDevice, submitDocumentHumanize } from "../src/document-humanize-api";
import { cancelDocumentDetection, detectDocument, detectText, getDocumentDetectionStatus } from "../src/ai-detector-api";
import { getSubscriptionPlans, getSubscriptionStatus } from "../src/subscription-api";
import { beginCashfreeUpgrade, clearCashfreeCallback } from "../src/payment-api";
import { getProfilePhotoUri, pickAndUploadProfilePhoto, removeProfilePhoto, updateMyAccount } from "../src/account-api";
import { getMyReports, submitProblemReport } from "../src/report-api";

const COLORS = {
  background: "#F9FAFB",
  surface: "#FFFFFF",
  purple: "#6D28D9",
  purpleLight: "#F5F3FF",
  dark: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  gold: "#FBBF24",
};

const NAV_ITEMS = [
  { key: "humanizer", label: "Humanizer", icon: "sparkles" },
  { key: "detector", label: "AI Detector", icon: "scan-outline" },
  { key: "files", label: "Files", icon: "folder-open-outline" },
  { key: "profile", label: "Profile", icon: "person-circle-outline" },
];

function BottomNavigation({ activeView, onNavigate }) {
  return (
    <View style={styles.bottomNav}>
      {NAV_ITEMS.map((item) => {
        const active = item.key === activeView;
        return <Pressable key={item.key} style={[styles.navItem, active && styles.navItemActive]} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => onNavigate(item.key)}>
          <View style={[styles.navIcon, active && styles.navIconActive]}><Ionicons name={item.icon} size={20} color={active ? "#FFFFFF" : COLORS.muted} /></View>
          <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
        </Pressable>;
      })}
    </View>
  );
}

function BillingSkeletonBlock({ shimmer, style }) {
  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-280, 280] });
  return <View style={[styles.skeletonBlock, style]}><Animated.View style={[styles.skeletonShimmer, { transform: [{ translateX }, { skewX: "-20deg" }] }]} /></View>;
}

function BillingCycleSkeleton() {
  const [shimmer] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 1250, easing: Easing.linear, useNativeDriver: true }));
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  return <View style={styles.billingCycleCard} accessibilityLabel="Loading billing cycle">
    <View style={styles.billingCycleHeader}><View><BillingSkeletonBlock shimmer={shimmer} style={styles.skeletonEyebrow} /><BillingSkeletonBlock shimmer={shimmer} style={styles.skeletonHeading} /></View><BillingSkeletonBlock shimmer={shimmer} style={styles.skeletonBadge} /></View>
    <BillingSkeletonBlock shimmer={shimmer} style={styles.skeletonProgress} />
    <View style={styles.billingProgressLabels}><BillingSkeletonBlock shimmer={shimmer} style={styles.skeletonProgressLabel} /><BillingSkeletonBlock shimmer={shimmer} style={styles.skeletonPercentage} /></View>
    <View style={styles.billingTimeline}><View style={styles.billingTimelineItem}><BillingSkeletonBlock shimmer={shimmer} style={styles.skeletonAvatar} /><View style={styles.billingTimelineCopy}><BillingSkeletonBlock shimmer={shimmer} style={styles.skeletonTimelineLabel} /><BillingSkeletonBlock shimmer={shimmer} style={styles.skeletonTimelineDate} /></View></View><View style={styles.billingTimelineLine} /><View style={styles.billingTimelineItem}><BillingSkeletonBlock shimmer={shimmer} style={styles.skeletonAvatar} /><View style={styles.billingTimelineCopy}><BillingSkeletonBlock shimmer={shimmer} style={styles.skeletonTimelineLabel} /><BillingSkeletonBlock shimmer={shimmer} style={styles.skeletonTimelineDate} /></View></View></View>
    <BillingSkeletonBlock shimmer={shimmer} style={styles.skeletonSupport} />
  </View>;
}

function DashboardSubpageHeader({ title, subtitle, onBack }) {
  return <><Pressable style={styles.subpageBackButton} onPress={onBack} accessibilityLabel="Go back"><Ionicons name="arrow-back" size={18} color={COLORS.purple} /><Text style={styles.subpageBackText}>Back</Text></Pressable><PageHeading title={title} subtitle={subtitle} /></>;
}

function formatInr(value) {
  const amount = Number(value) || 0;
  return "INR " + amount.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function SubscriptionPage({ checkoutProcessing, errorMessage, onBack, onClaim, onSelectPlan, plans, selectedPlanKey }) {
  const plan = plans?.find((item) => item.planKey === selectedPlanKey) || plans?.[0];
  return <ScrollView style={styles.mainScroll} contentContainerStyle={styles.subpageContent} showsVerticalScrollIndicator={false}>
    <DashboardSubpageHeader title="Upgrade Sentistra" subtitle="Unlock the complete research workspace." onBack={onBack} />
    {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
    {!plans ? (!errorMessage && <Text style={styles.documentProgressText}>Loading plans...</Text>) : <>
      <View style={styles.planOptions} accessibilityRole="radiogroup">
        {plans.map((item) => {
          const selected = item.planKey === plan?.planKey;
          return <Pressable key={item.planKey} style={[styles.planOption, selected && styles.planOptionSelected]} onPress={() => onSelectPlan(item.planKey)} disabled={checkoutProcessing} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${item.label} for ${formatInr(item.price)}`}>
            <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={20} color={selected ? COLORS.purple : COLORS.muted} />
            <View style={styles.planOptionCopy}>
              <Text style={styles.planOptionLabel}>{item.label}</Text>
              {item.durationDays > 30 && <Text style={styles.planOptionMonthly}>{formatInr(item.monthlyPrice)} / month</Text>}
            </View>
            <View style={styles.planOptionPrices}>
              {Number(item.originalPrice) > Number(item.price) && <Text style={styles.planOptionOldPrice}>{formatInr(item.originalPrice)}</Text>}
              <Text style={styles.planOptionPrice}>{formatInr(item.price)}</Text>
            </View>
          </Pressable>;
        })}
      </View>
      {!!plan && <View style={styles.subscriptionCard}>
        <View style={styles.subscriptionNameRow}><Text style={styles.subscriptionName}>{plan.name}</Text><Text style={styles.subscriptionBadge}>LIMITED TIME</Text></View>
        <Text style={styles.subscriptionTitle}>{plan.title}</Text><Text style={styles.subscriptionDescription}>{plan.description}</Text>
        <View style={styles.subscriptionPriceRow}>{Number(plan.originalPrice) > Number(plan.price) && <Text style={styles.subscriptionOldPrice}>{formatInr(plan.originalPrice)}</Text>}<Text style={styles.subscriptionPrice}>{formatInr(plan.price)}</Text><Text style={styles.subscriptionInterval}>/ {plan.label}</Text></View>
        <Pressable style={[styles.subscriptionClaim, checkoutProcessing && styles.subscriptionClaimDisabled]} disabled={checkoutProcessing} onPress={() => onClaim(plan.planKey)}><Ionicons name="sparkles" size={16} color="#DDD6FE" /><Text style={styles.subscriptionClaimText}>{checkoutProcessing ? "Opening checkout..." : `Get ${plan.label}`}</Text></Pressable>
        {plan.features.map((feature) => <View key={feature} style={styles.subscriptionFeature}><Ionicons name="checkmark-circle" size={20} color={COLORS.purple} /><Text style={styles.subscriptionFeatureText}>{feature}</Text></View>)}
        {!!plan.promoText && <Text style={styles.subscriptionPromo}>{plan.promoText}</Text>}
      </View>}
    </>}
  </ScrollView>;
}

function BillingPage({ billingError, billingLoading, billingStatus, onBack }) {
  return <ScrollView style={styles.mainScroll} contentContainerStyle={styles.subpageContent} showsVerticalScrollIndicator={false}>
    <DashboardSubpageHeader title="Usage & Billing" subtitle="Follow your current paid billing cycle." onBack={onBack} />
    {billingLoading ? <BillingCycleSkeleton /> : billingError ? <Text style={styles.errorText}>{billingError}</Text> : billingStatus?.billing_cycle ? (() => {
      const cycle = billingStatus.billing_cycle;
      const progress = Math.max(0, Math.min(100, Number(cycle.progress_percent) || 0));
      return <View style={styles.billingCycleCard}>
        <View style={styles.billingCycleHeader}><View><Text style={styles.billingEyebrow}>{cycle.plan_name ? cycle.plan_name.toUpperCase() : "PAID PLAN"}</Text><Text style={styles.billingStatus}>{cycle.status === "active" ? "Current billing cycle" : "Previous billing cycle"}</Text></View><View style={[styles.billingStatusBadge, cycle.status !== "active" && styles.billingStatusBadgeExpired]}><Text style={[styles.billingStatusBadgeText, cycle.status !== "active" && styles.billingStatusBadgeTextExpired]}>{cycle.status === "active" ? "ACTIVE" : "ENDED"}</Text></View></View>
        <View style={styles.billingProgressTrack}><View style={[styles.billingProgressFill, { width: progress + "%" }]} /></View>
        <View style={styles.billingProgressLabels}><Text style={styles.billingProgressLabel}>{cycle.elapsed_days} of {cycle.duration_days} days used</Text><Text style={styles.billingProgressValue}>{progress}%</Text></View>
        <View style={styles.billingTimeline}><View style={styles.billingTimelineItem}><View style={styles.billingTimelineDot}><Ionicons name="calendar-outline" size={15} color={COLORS.purple} /></View><View style={styles.billingTimelineCopy}><Text style={styles.billingTimelineLabel}>Payment start</Text><Text style={styles.billingTimelineDate}>{formatBillingDate(cycle.started_at)}</Text></View></View><View style={styles.billingTimelineLine} /><View style={styles.billingTimelineItem}><View style={[styles.billingTimelineDot, styles.billingTimelineDotEnd]}><Ionicons name="flag-outline" size={15} color="#FFFFFF" /></View><View style={styles.billingTimelineCopy}><Text style={styles.billingTimelineLabel}>Payment end</Text><Text style={styles.billingTimelineDate}>{formatBillingDate(cycle.ends_at)}</Text></View></View></View>
        <Text style={styles.billingSupportText}>{cycle.status === "active" ? cycle.remaining_days + " day(s) remaining in this cycle." : "This billing cycle has ended. Upgrade again to begin a new cycle."}</Text>
      </View>;
    })() : <View style={styles.billingEmpty}><Ionicons name="card-outline" size={28} color={COLORS.purple} /><Text style={styles.billingEmptyTitle}>No paid billing cycle</Text><Text style={styles.billingEmptyText}>Your payment timeline will appear here after a verified plan upgrade.</Text></View>}
  </ScrollView>;
}

// The photo is fetched with the signed-in request and shown from a private cache file.
// `photoVersion` changes with every upload, so each new photo loads fresh.
function ProfilePhotoImage({ photoVersion, size }) {
  const [uri, setUri] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!photoVersion) return undefined;
    let mounted = true;
    getProfilePhotoUri(photoVersion)
      .then((value) => { if (mounted) setUri(value); })
      .catch(() => { if (mounted) setFailed(true); });
    return () => { mounted = false; };
  }, [photoVersion]);
  if (!photoVersion || !uri || failed) return <Ionicons name="person-outline" size={Math.round(size * 0.4)} color={COLORS.purple} />;
  return <Image
    source={{ uri }}
    style={{ width: size, height: size, borderRadius: size / 2 }}
    onError={() => setFailed(true)}
    accessibilityLabel="Profile photo"
  />;
}

function ProfilePhoto({ photoVersion, size }) {
  // Keyed by version so a new photo gets a fresh load (and a fresh retry after an error).
  return <ProfilePhotoImage key={photoVersion || "none"} photoVersion={photoVersion} size={size} />;
}

function AccountSettingsPage({ accountError, accountName, accountPhone, accountSaving, photoBusy, photoVersion, onBack, onChangePhoto, onNameChange, onPhoneChange, onRemovePhoto, onSave }) {
  return <ScrollView style={styles.mainScroll} contentContainerStyle={styles.subpageContent} keyboardShouldPersistTaps="handled">
    <DashboardSubpageHeader title="Account Settings" subtitle="Manage your account details securely." onBack={onBack} />
    <View style={styles.accountSettingsCard}>
      <View style={styles.photoEditor}>
        <Pressable style={styles.photoEditorAvatar} onPress={onChangePhoto} disabled={photoBusy} accessibilityRole="button" accessibilityLabel="Change profile photo">
          <ProfilePhoto photoVersion={photoVersion} size={84} />
          <View style={styles.photoEditorBadge}><Ionicons name={photoBusy ? "hourglass-outline" : "camera"} size={14} color="#FFFFFF" /></View>
        </Pressable>
        <View style={styles.photoEditorActions}>
          <Text style={styles.photoEditorTitle}>Profile photo</Text>
          <Text style={styles.photoEditorHint}>{photoBusy ? "Updating your photo..." : "JPEG, PNG or WebP. It is cropped to a square."}</Text>
          <View style={styles.photoEditorButtons}>
            <Pressable style={[styles.photoButton, photoBusy && styles.accountSaveButtonDisabled]} onPress={onChangePhoto} disabled={photoBusy}><Text style={styles.photoButtonText}>{photoVersion ? "Change photo" : "Add photo"}</Text></Pressable>
            {!!photoVersion && <Pressable style={[styles.photoButton, styles.photoRemoveButton, photoBusy && styles.accountSaveButtonDisabled]} onPress={onRemovePhoto} disabled={photoBusy}><Text style={[styles.photoButtonText, styles.photoRemoveText]}>Remove</Text></Pressable>}
          </View>
        </View>
      </View>
      <Text style={styles.accountSettingsTitle}>Your details</Text>
      <Text style={styles.accountSettingsText}>Keep your name and phone number up to date for account and payment support.</Text>
      <Text style={styles.accountLabel}>FULL NAME</Text>
      <TextInput value={accountName} onChangeText={onNameChange} style={styles.accountInput} autoCapitalize="words" autoCorrect={false} maxLength={80} placeholder="Your full name" placeholderTextColor="#9CA3AF" />
      <Text style={styles.accountLabel}>PHONE NUMBER</Text>
      <TextInput value={accountPhone} onChangeText={onPhoneChange} style={styles.accountInput} keyboardType="phone-pad" maxLength={16} placeholder="Your phone number" placeholderTextColor="#9CA3AF" />
      {!!accountError && <Text style={styles.accountError}>{accountError}</Text>}
      <Pressable style={[styles.accountSaveButton, accountSaving && styles.accountSaveButtonDisabled]} disabled={accountSaving} onPress={onSave}><Ionicons name="checkmark-circle-outline" size={19} color="#FFFFFF" /><Text style={styles.accountSaveText}>{accountSaving ? "Saving changes..." : "Save changes"}</Text></Pressable>
    </View>
  </ScrollView>;
}

const PRIVACY_SECTIONS = [
  ["1. Information We Collect", "We collect account information you provide, such as your name, email address, phone number, optional profile photo, and referral details. We also retain subscription, transaction, and support records, including problem reports you send from the app, needed to operate your account and meet legal obligations."],
  ["2. Text, Documents, and AI Processing", "Sentistra processes the text and DOCX files you submit only to provide humanization, AI detection, and report features. Uploaded documents and generated files are stored in a private workspace associated with your account and are automatically removed after the service retention period, normally within 24 hours."],
  ["3. How We Use Information", "We use your information to authenticate you, deliver requested AI features, maintain your workspace, provide support, protect the platform from misuse, improve reliability, and communicate important account or service updates."],
  ["4. Payments and Subscriptions", "Payments are processed through Cashfree. Sentistra does not store your complete card, UPI, or banking credentials. We retain only the payment and order details required to confirm a subscription, show billing history, prevent duplicate transactions, and provide support."],
  ["5. Sharing and Service Providers", "We do not sell your personal information. We share only the minimum necessary information with trusted providers that help us operate the service, including hosting, authentication, email delivery, payment processing, and AI infrastructure. Providers must handle information only for their authorized service."],
  ["6. Security", "We use authenticated access controls, private account workspaces, encrypted connections where available, server-side authorization checks, and restricted service credentials. No online system is completely secure, so please protect your password and contact us promptly if you suspect unauthorized activity."],
  ["7. Your Choices", "You may update your name, phone number, and profile photo, or remove your photo, in Account Settings. You can download files made available in your workspace and may request help with account or data questions through Sentistra Support. Subscription access is governed by the plan and billing information shown in the app."],
  ["8. Responsible Use", "AI-generated results are research and writing-support tools. You are responsible for reviewing output for accuracy, originality, citations, privacy, and compliance before relying on it. Do not submit unlawful, harmful, confidential, or third-party content unless you have the right to process it."],
  ["9. Children", "Sentistra is not intended for children under the age required to consent to online services in their jurisdiction. If you believe a child has provided personal information, contact us so we can review and remove it where appropriate."],
  ["10. Policy Updates and Contact", "We may update this policy as Sentistra develops or legal requirements change. Material changes will be reflected in the app or through account communications. For privacy questions, contact Sentistra Support at sentistra@skillinnovex.in."],
];

function PrivacyPolicyPage({ onBack }) {
  return <ScrollView style={styles.mainScroll} contentContainerStyle={styles.subpageContent} showsVerticalScrollIndicator={false}>
    <DashboardSubpageHeader title="Privacy Policy" subtitle="How Sentistra handles your information and workspace." onBack={onBack} />
    <View style={styles.privacyCard}>
      <View style={styles.privacyIntro}><Ionicons name="shield-checkmark-outline" size={26} color={COLORS.purple} /><View style={styles.privacyIntroCopy}><Text style={styles.privacyIntroTitle}>Your privacy matters</Text><Text style={styles.privacyEffective}>Effective 6 October 2026</Text></View></View>
      <Text style={styles.privacyLead}>This policy explains how Sentistra collects, uses, protects, and retains information when you use our writing, document, AI-detection, and subscription services.</Text>
      {PRIVACY_SECTIONS.map(([title, body]) => <View key={title} style={styles.privacySection}><Text style={styles.privacySectionTitle}>{title}</Text><Text style={styles.privacySectionText}>{body}</Text></View>)}
    </View>
  </ScrollView>;
}

// Keys must match REPORT_CATEGORIES on the server.
const REPORT_CATEGORIES = [
  { key: "bug", label: "App bug", icon: "bug-outline" },
  { key: "tools", label: "Humanizer / AI detector", icon: "sparkles-outline" },
  { key: "payment", label: "Payment & plan", icon: "card-outline" },
  { key: "account", label: "Account & login", icon: "person-outline" },
  { key: "other", label: "Something else", icon: "help-circle-outline" },
];
const REPORT_STATUS = {
  open: { label: "Received", color: "#92400E", background: "#FEF3C7" },
  in_progress: { label: "In progress", color: "#1D4ED8", background: "#DBEAFE" },
  resolved: { label: "Resolved", color: "#15803D", background: "#DCFCE7" },
  closed: { label: "Closed", color: "#4B5563", background: "#F3F4F6" },
};
const REPORT_MIN_LENGTH = 10;
const REPORT_MAX_LENGTH = 2000;

function ReportProblemPage({ onBack }) {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [reports, setReports] = useState(null);
  const [listError, setListError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const descriptionLength = description.trim().length;

  useEffect(() => {
    let mounted = true;
    getMyReports()
      .then((items) => { if (mounted) setReports(items); })
      .catch((error) => { if (mounted) setListError(error.message || "Unable to load your reports."); });
    return () => { mounted = false; };
  }, []);

  const refreshReports = async () => {
    setRefreshing(true);
    try {
      setReports(await getMyReports());
      setListError("");
    } catch (error) {
      setListError(error.message || "Unable to load your reports.");
    } finally {
      setRefreshing(false);
    }
  };

  const sendReport = async () => {
    if (sending) return;
    if (!category) { setFormError("Choose what the problem is about."); return; }
    if (descriptionLength < REPORT_MIN_LENGTH) { setFormError(`Please describe the problem in at least ${REPORT_MIN_LENGTH} characters.`); return; }
    Keyboard.dismiss();
    setSending(true);
    setFormError("");
    try {
      const report = await submitProblemReport({ category, description });
      setReports((current) => [report, ...(current || []).filter((item) => item.id !== report.id)]);
      setListError("");
      setCategory("");
      setDescription("");
      Alert.alert("Report sent", `We received your report ${report.ticket}. You can follow its status below.`);
    } catch (error) {
      setFormError(error.message || "Unable to send your report.");
    } finally {
      setSending(false);
    }
  };

  return <ScrollView style={styles.mainScroll} contentContainerStyle={styles.subpageContent} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshReports} tintColor={COLORS.purple} colors={[COLORS.purple]} />}>
    <DashboardSubpageHeader title="Report a Problem" subtitle="Tell us what went wrong. Our team reviews every report." onBack={onBack} />
    <View style={styles.accountSettingsCard}>
      <Text style={styles.accountLabel}>WHAT IS IT ABOUT?</Text>
      <View style={styles.reportCategories}>
        {REPORT_CATEGORIES.map((item) => {
          const selected = item.key === category;
          return <Pressable key={item.key} style={[styles.reportCategory, selected && styles.reportCategorySelected]} onPress={() => { setCategory(item.key); setFormError(""); }} accessibilityRole="radio" accessibilityState={{ selected }}>
            <Ionicons name={item.icon} size={15} color={selected ? COLORS.purple : COLORS.muted} />
            <Text style={[styles.reportCategoryText, selected && styles.reportCategoryTextSelected]}>{item.label}</Text>
          </Pressable>;
        })}
      </View>
      <Text style={styles.accountLabel}>DESCRIBE THE PROBLEM</Text>
      <TextInput
        value={description}
        onChangeText={(value) => { setDescription(value); if (formError) setFormError(""); }}
        style={[styles.accountInput, styles.reportInput]}
        multiline
        textAlignVertical="top"
        maxLength={REPORT_MAX_LENGTH}
        placeholder="What happened? What did you expect? Which tool were you using?"
        placeholderTextColor="#9CA3AF"
      />
      <Text style={styles.reportCounter}>{description.length}/{REPORT_MAX_LENGTH}</Text>
      {!!formError && <Text style={styles.accountError}>{formError}</Text>}
      <Pressable style={[styles.accountSaveButton, sending && styles.accountSaveButtonDisabled]} disabled={sending} onPress={sendReport}><Ionicons name="send-outline" size={18} color="#FFFFFF" /><Text style={styles.accountSaveText}>{sending ? "Sending..." : "Send report"}</Text></Pressable>
    </View>

    <Text style={styles.reportListTitle}>Your reports</Text>
    {!!listError && <Text style={styles.accountError}>{listError}</Text>}
    {reports === null && !listError && <Text style={styles.reportEmpty}>Loading your reports...</Text>}
    {reports?.length === 0 && <Text style={styles.reportEmpty}>You have not reported any problems yet.</Text>}
    {reports?.map((report) => {
      const status = REPORT_STATUS[report.status] || REPORT_STATUS.open;
      const categoryLabel = REPORT_CATEGORIES.find((item) => item.key === report.category)?.label || "Other";
      return <View key={report.id} style={styles.reportCard}>
        <View style={styles.reportCardHead}>
          <Text style={styles.reportTicket}>{report.ticket}</Text>
          <View style={[styles.reportStatus, { backgroundColor: status.background }]}><Text style={[styles.reportStatusText, { color: status.color }]}>{status.label}</Text></View>
        </View>
        <Text style={styles.reportMeta}>{categoryLabel} · {formatBillingDate(report.createdAt)}</Text>
        <Text style={styles.reportDescription}>{report.description}</Text>
        {!!report.adminReply && <View style={styles.reportReply}><Text style={styles.reportReplyLabel}>Reply from Sentistra support</Text><Text style={styles.reportReplyText}>{report.adminReply}</Text></View>}
      </View>;
    })}
  </ScrollView>;
}

function activeDocumentStorageKey(userId) {
  return `sentistra_active_document_job_${userId}`;
}

function activeDetectorStorageKey(userId) {
  return `sentistra_active_detector_job_${userId}`;
}

function PageHeading({ title, subtitle }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.headingTitle}>{title}</Text>
      <Text style={styles.headingSubtitle}>{subtitle}</Text>
    </View>
  );
}

function ProcessStep({ text, status }) {
  const [entrance] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(1));
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    if (status === "active") {
      const pulseAnimation = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]));
      const spinAnimation = Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }),
      );
      pulseAnimation.start();
      spinAnimation.start();
      return () => {
        pulseAnimation.stop();
        spinAnimation.stop();
      };
    }
    return undefined;
  }, [entrance, pulse, spin, status]);

  const rotation = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const translateY = entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Animated.View style={[styles.processStep, { opacity: entrance, transform: [{ translateY }] }]}>
      {status === "active" ? (
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="refresh-circle-outline" size={17} color={COLORS.purple} />
        </Animated.View>
      ) : (
        <Ionicons name="checkmark-circle" size={17} color="#2563EB" />
      )}
      <Animated.Text style={[styles.processText, status === "active" && { opacity: pulse }]}>{text}</Animated.Text>
    </Animated.View>
  );
}

function ScoreGauge({ score }) {
  const numericScore = Math.max(0, Math.min(100, Number(score) || 0));
  const [pulse] = useState(() => new Animated.Value(0.96));
  const angle = (180 - numericScore * 1.8) * (Math.PI / 180);
  const innerRadius = 135;
  const outerRadius = 165;
  const x1 = 190 + innerRadius * Math.cos(angle);
  const y1 = 190 - innerRadius * Math.sin(angle);
  const x2 = 190 + outerRadius * Math.cos(angle);
  const y2 = 190 - outerRadius * Math.sin(angle);
  const inactiveColor = "#f1f3f5";
  let segmentColors = ["#ef4343", "#fa8c35", "#00b074"];
  if (numericScore < 5) {
    segmentColors = ["#00b074", "#00b074", "#00b074"];
  } else if (numericScore < 15) {
    segmentColors = ["#00b074", inactiveColor, inactiveColor];
  } else if (numericScore < 50) {
    segmentColors = ["#fa8c35", "#fa8c35", inactiveColor];
  } else if (numericScore >= 50) {
    segmentColors = ["#ef4343", "#ef4343", "#ef4343"];
  }

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.96, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.scoreGauge, { opacity: pulse }]}>
      <Svg width="100%" height={152} viewBox="0 0 380 230">
        <Path d="M 68 185 A 122 122 0 0 1 312 185" fill="none" stroke="#ececec" strokeWidth="1.2" />
        <Line x1="68" y1="181" x2="68" y2="190" stroke="#757575" strokeWidth="2" strokeLinecap="round" />
        <Line x1="312" y1="181" x2="312" y2="190" stroke="#757575" strokeWidth="2" strokeLinecap="round" />
        <Path d="M 35 190 A 155 155 0 0 1 345 190" fill="none" stroke={inactiveColor} strokeWidth="28" strokeLinecap="round" strokeDasharray="487 487" />
        <Path d="M 35 190 A 155 155 0 0 1 345 190" fill="none" stroke={segmentColors[0]} strokeWidth="28" strokeLinecap="round" strokeDasharray="142 487" />
        <Path d="M 35 190 A 155 155 0 0 1 345 190" fill="none" stroke={segmentColors[1]} strokeWidth="28" strokeLinecap="round" strokeDasharray="162 487" strokeDashoffset="-162" />
        <Path d="M 35 190 A 155 155 0 0 1 345 190" fill="none" stroke={segmentColors[2]} strokeWidth="28" strokeLinecap="round" strokeDasharray="148 487" strokeDashoffset="-339" />
        <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000000" strokeWidth="3" strokeLinecap="round" />
        <SvgText x="190" y="146" fontSize="58" fontWeight="700" fill="#000000" textAnchor="middle" dominantBaseline="middle">{Math.round(numericScore)}</SvgText>
        <SvgText x="190" y="184" fontSize="15" fontWeight="500" fill="#73787e" textAnchor="middle" dominantBaseline="middle">Overall AI score</SvgText>
      </Svg>
    </Animated.View>
  );
}

function AIDetectorView({ detectorJob, setDetectorJob, userId, onSubscriptionRequired, onUsageChanged }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;

  const showResult = (nextResult) => {
    setResult(nextResult);
    setErrorMessage("");
  };

  const detectEnteredText = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      showResult(await detectText(text));
      onUsageChanged();
    } catch (error) {
      setErrorMessage(error.message || "Unable to detect AI text.");
      if (/free tier has ended|SUBSCRIPTION_REQUIRED/i.test(error.message || "")) onSubscriptionRequired();
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async () => {
    if (loading) return;
    const selection = await File.pickFileAsync({ mimeTypes: ["*/*"], multipleFiles: false });
    if (selection.canceled || !selection.result) return;
    const selectedType = selection.result.type || "";
    const isDocx = selection.result.name.toLowerCase().endsWith(".docx") || selectedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!isDocx) {
      setErrorMessage("Please select a .docx Word file.");
      return;
    }
    setResult(null);
    setErrorMessage("");
    setLoading(true);
    try {
      const queuedJob = await detectDocument(selection.result);
      setDetectorJob(queuedJob);
      onUsageChanged();
      await AsyncStorage.setItem(activeDetectorStorageKey(userId), queuedJob.job_id);
    } catch (error) {
      setErrorMessage(error.message || "Unable to analyze this document.");
      if (/free tier has ended|SUBSCRIPTION_REQUIRED/i.test(error.message || "")) onSubscriptionRequired();
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!result?.report_id) return;
    saveDocumentToDevice(result.report_id, result.file_name).catch((error) => setErrorMessage(error.message || "Unable to download the report."));
  };

  const processing = detectorJob?.status === "queued" || detectorJob?.status === "processing";
  const cancelReport = async () => {
    if (!detectorJob?.job_id || cancelling) return;
    setCancelling(true);
    try {
      await cancelDocumentDetection(detectorJob.job_id);
      await AsyncStorage.removeItem(activeDetectorStorageKey(userId));
      setDetectorJob((current) => ({ ...current, status: "cancelled", message: "AI detection report cancelled" }));
    } catch (error) {
      setErrorMessage(error.message || "Unable to cancel AI detection.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <ScrollView style={styles.mainScroll} contentContainerStyle={styles.viewContent}>
      <PageHeading title="AI Detector" subtitle="Check whether your text or document appears AI-generated." />
      <View style={styles.detectorBox}>
        <TextInput
          style={styles.detectorInput}
          value={text}
          onChangeText={(value) => { setText(value); setResult(null); setErrorMessage(""); }}
          placeholder="Paste your text here..."
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
          maxLength={12000}
        />
        <View style={styles.detectorFooter}>
          <Text style={[styles.wordCount, wordCount > 1000 && styles.wordCountLimit]}>{wordCount}/1,000 words</Text>
          <Pressable style={styles.detectButton} onPress={detectEnteredText} disabled={loading || !text.trim() || wordCount > 1000}>
            <Ionicons name="scan-outline" size={17} color="#FFFFFF" />
            <Text style={styles.submitText}>{loading ? "Checking..." : "Detect AI"}</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.detectorOr}>OR</Text>
      <Pressable style={styles.detectorUpload} onPress={uploadDocument} disabled={loading} accessibilityRole="button" accessibilityLabel="Upload document for AI detection">
        <Ionicons name="document-attach-outline" size={27} color={COLORS.purple} />
        <Text style={styles.detectorUploadTitle}>Upload a Word document</Text>
        <Text style={styles.detectorUploadText}>.docx only, up to 3,000 words</Text>
      </Pressable>
      {(processing || detectorJob?.status === "completed") && (
        <View style={styles.documentProgress}>
          <View style={styles.documentProgressHeader}>
            <Text style={styles.documentProgressTitle}>{detectorJob.message || "Preparing AI detection..."}</Text>
            <Text style={styles.documentProgressValue}>{detectorJob.progress || 0}%</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${detectorJob.progress || 0}%` }]} /></View>
          <Text style={styles.documentProgressText}>You can leave this screen while we create your private AI detection report.</Text>
          {detectorJob?.status === "completed" && <View style={styles.processStep}><Ionicons name="checkmark-circle" size={17} color="#2563EB" /><Text style={styles.processText}>Report completed successfully.</Text></View>}
          {processing && (
          <Pressable style={styles.cancelDocumentButton} onPress={cancelReport} disabled={cancelling}>
            <Ionicons name="close-circle-outline" size={17} color="#B91C1C" />
            <Text style={styles.cancelDocumentText}>{cancelling ? "Cancelling..." : "Cancel processing"}</Text>
          </Pressable>
          )}
        </View>
      )}
      {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      {!!result && (
        <View style={styles.detectorResult}>
          <ScoreGauge score={result.ai_score} />
          <View style={styles.detectorMeta}>
            <Text style={styles.resultLabel}>Analyzed words</Text>
            <Text style={styles.resultValue}>{result.word_count || wordCount}</Text>
          </View>
          {!!result.report_id && <Pressable style={styles.reportDownloadButton} onPress={downloadReport} accessibilityRole="button" accessibilityLabel="Download AI detection report">
            <Ionicons name="download-outline" size={17} color="#FFFFFF" />
            <Text style={styles.submitText}>Download report</Text>
          </Pressable>}
        </View>
      )}
      {detectorJob?.status === "completed" && (
        <View style={styles.detectorResult}>
          <ScoreGauge score={detectorJob.final_ai_score} />
          <View style={styles.detectorMeta}>
            <Text style={styles.resultLabel}>Analyzed words</Text>
            <Text style={styles.resultValue}>{detectorJob.word_count || 0}</Text>
          </View>
          <Pressable style={styles.reportDownloadButton} onPress={() => saveDocumentToDevice(detectorJob.job_id, detectorJob.file_name).catch((error) => setErrorMessage(error.message || "Unable to download the report."))}>
            <Ionicons name="download-outline" size={17} color="#FFFFFF" />
            <Text style={styles.submitText}>Download report</Text>
          </Pressable>
        </View>
      )}
      {detectorJob?.status === "failed" && (
        <View style={styles.documentFailed}>
          <Ionicons name="alert-circle-outline" size={24} color="#B91C1C" />
          <View style={styles.documentReadyCopy}>
            <Text style={styles.documentFailedTitle}>AI detection report stopped</Text>
            <Text style={styles.documentProgressText}>{detectorJob.message || "Unable to generate the AI detection report."}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function DocumentHumanizerView({ documentFile, setDocumentFile, job, setJob, errorMessage, setErrorMessage, selectedModel, setSelectedModel, models, userId, onSubscriptionRequired, onUsageChanged }) {
  const [cancelling, setCancelling] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const processing = job?.status === "queued" || job?.status === "processing";
  const documentModel = job?.model || selectedModel;

  const selectDocument = async () => {
    const selection = await File.pickFileAsync({ mimeTypes: ["*/*"], multipleFiles: false });
    if (selection.canceled || !selection.result) return;
    const selectedType = selection.result.type || "";
    const isDocx = selection.result.name.toLowerCase().endsWith(".docx") || selectedType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!isDocx) {
      setErrorMessage("Please select a .docx Word file. Older .doc files are not supported.");
      return;
    }
    setDocumentFile(selection.result);
    setJob(null);
    setErrorMessage("");
    AsyncStorage.removeItem(activeDocumentStorageKey(userId));
  };

  const startDocumentHumanization = async () => {
    if (!documentFile || processing) return;
    setErrorMessage("");
    try {
      const queuedJob = await submitDocumentHumanize(documentFile, selectedModel);
      setJob(queuedJob);
      onUsageChanged();
      await AsyncStorage.setItem(activeDocumentStorageKey(userId), queuedJob.job_id);
    } catch (error) {
      setErrorMessage(error.message || "Unable to upload this document.");
      if (/free tier has ended|SUBSCRIPTION_REQUIRED/i.test(error.message || "")) onSubscriptionRequired();
    }
  };

  const downloadDocument = () => {
    if (!job?.job_id) return;
    saveDocumentToDevice(job.job_id).catch((error) => setErrorMessage(error.message || "Unable to save the document."));
  };

  const cancelDocument = async () => {
    if (!job?.job_id || cancelling) return;
    setCancelling(true);
    try {
      await cancelDocumentHumanize(job.job_id);
      await AsyncStorage.removeItem(activeDocumentStorageKey(userId));
      setJob((current) => ({ ...current, status: "cancelled", message: "Document processing cancelled" }));
    } catch (error) {
      setErrorMessage(error.message || "Unable to cancel document processing.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <View style={styles.documentView}>
      <Pressable style={styles.documentPicker} onPress={selectDocument} disabled={processing} accessibilityRole="button" accessibilityLabel="Choose Word document">
        <Ionicons name="document-attach-outline" size={30} color={COLORS.purple} />
        <Text style={styles.documentPickerTitle}>{documentFile?.name || job?.original_name || "Choose a Word document"}</Text>
        <Text style={styles.documentPickerText}>.docx only, up to 3,000 words</Text>
      </Pressable>
      <View style={styles.documentModelPanel}>
        <View style={styles.documentModelHeading}>
          <Ionicons name="flask-outline" size={16} color={COLORS.purple} />
          <Text style={styles.documentModelLabel}>Research model profile</Text>
        </View>
        <Pressable
          style={[styles.documentModelSelect, processing && styles.documentModelSelectDisabled]}
          onPress={() => setModelMenuOpen(true)}
          disabled={processing}
          accessibilityRole="button"
          accessibilityLabel="Select document humanizer model"
        >
          <View style={styles.documentModelCopy}>
            <Text style={styles.documentModelName}>{documentModel}</Text>
            <Text style={styles.documentModelDescription}>Applied consistently across document sections</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={COLORS.purple} />
        </Pressable>
      </View>
      {!!documentFile && !processing && !job?.status?.startsWith("completed") && (
        <Pressable style={styles.documentAction} onPress={startDocumentHumanization}>
          <Ionicons name="sparkles" size={17} color="#FFFFFF" />
          <Text style={styles.submitText}>Humanize document</Text>
        </Pressable>
      )}
      {processing && (
        <View style={styles.documentProgress}>
          <View style={styles.documentProgressHeader}>
            <Text style={styles.documentProgressTitle}>{job.message || "Preparing document..."}</Text>
            <Text style={styles.documentProgressValue}>{job.progress || 0}%</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${job.progress || 0}%` }]} /></View>
          <Text style={styles.documentProgressText}>{job.queue_position > 0 ? `Queue position ${job.queue_position}. You can leave this screen while we preserve your formatting.` : "You can leave this screen open while we preserve your formatting."}</Text>
          <Pressable style={styles.cancelDocumentButton} onPress={cancelDocument} disabled={cancelling} accessibilityRole="button" accessibilityLabel="Cancel document processing">
            <Ionicons name="close-circle-outline" size={17} color="#B91C1C" />
            <Text style={styles.cancelDocumentText}>{cancelling ? "Cancelling..." : "Cancel processing"}</Text>
          </Pressable>
        </View>
      )}
      {job?.status === "completed" && (
        <View style={styles.documentCompleteSection}>
          <View style={styles.documentReady}>
            <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
            <View style={styles.documentReadyCopy}><Text style={styles.documentReadyTitle}>Your document is ready</Text><Text style={styles.documentProgressText}>{job.message || `${job.word_count} words processed`}</Text></View>
            <Pressable style={styles.downloadButton} onPress={downloadDocument} accessibilityLabel="Download humanized document"><Ionicons name="download-outline" size={19} color="#FFFFFF" /></Pressable>
          </View>
          {typeof job.final_ai_score === "number" && (
            <View style={styles.documentScoreResult}>
              <ScoreGauge score={job.final_ai_score} />
              <View style={styles.detectorMeta}>
                <Text style={styles.resultLabel}>Humanized document AI score</Text>
                <Text style={styles.resultValue}>{job.final_ai_score.toFixed(2)}%</Text>
              </View>
            </View>
          )}
        </View>
      )}
      {job?.status === "failed" && (
        <View style={styles.documentFailed}>
          <Ionicons name="alert-circle-outline" size={24} color="#B91C1C" />
          <View style={styles.documentReadyCopy}>
            <Text style={styles.documentFailedTitle}>Document processing stopped</Text>
            <Text style={styles.documentProgressText}>{job.message || "A document section could not be humanized."}</Text>
          </View>
        </View>
      )}
      {!!errorMessage && <Text style={errorMessage === "No document today" ? styles.noDocumentText : styles.errorText}>{errorMessage}</Text>}
      <Modal visible={modelMenuOpen} transparent animationType="fade" onRequestClose={() => setModelMenuOpen(false)}>
        <Pressable style={styles.modelBackdrop} onPress={() => setModelMenuOpen(false)}>
          <Pressable style={styles.modelMenu} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modelMenuTitle}>Choose a document model</Text>
            {models.map((model) => (
              <Pressable
                key={model.name}
                disabled={model.locked}
                style={[styles.modelOption, model.name === documentModel && styles.modelOptionActive, model.locked && styles.modelOptionLocked]}
                onPress={() => {
                  setSelectedModel(model.name);
                  setModelMenuOpen(false);
                }}
              >
                <Text style={[styles.modelOptionText, model.name === documentModel && styles.modelOptionTextActive, model.locked && styles.modelOptionTextLocked]}>{model.name}</Text>
                {model.locked ? <Ionicons name="lock-closed" size={15} color={COLORS.muted} /> : model.name === documentModel && <Ionicons name="checkmark" size={18} color={COLORS.purple} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function HumanizerView({ documentFile, setDocumentFile, documentJob, setDocumentJob, documentError, setDocumentError, userId, onSubscriptionRequired, onUsageChanged }) {
  const humanizerScrollRef = useRef(null);
  const [text, setText] = useState("");
  const [mode, setMode] = useState("text");
  const [selectedModel, setSelectedModel] = useState("Sentistra 0.1");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processSteps, setProcessSteps] = useState([]);
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const documentProcessing = documentJob?.status === "queued" || documentJob?.status === "processing";
  const displayedMode = documentProcessing ? "document" : mode;
  const [borderAnimation] = useState(() => new Animated.Value(0));
  const models = [
    { name: "Sentistra 0.1", locked: false },
    { name: "Sentistra 0.2", locked: false },
    { name: "Sentistra Academic", locked: true },
  ];
  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const outputWordCount = result?.humanized_text?.trim() ? result.humanized_text.trim().split(/\s+/).filter(Boolean).length : 0;
  const handleTextChange = (value) => {
    const matches = [...value.matchAll(/\S+/g)];
    if (matches.length > 200) {
      setText(value.slice(0, matches[200].index).trimEnd());
      setErrorMessage("Maximum 200 words allowed.");
      return;
    }

    setText(value);
    if (errorMessage === "Maximum 200 words allowed.") setErrorMessage("");
  };

  useEffect(() => {
    if (!processing) return undefined;

    const glowAnimation = Animated.loop(Animated.sequence([
      Animated.timing(borderAnimation, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(borderAnimation, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]));
    glowAnimation.start();
    return () => glowAnimation.stop();
  }, [borderAnimation, processing]);

  useEffect(() => {
    if (!processing) return undefined;

    const timers = [
      setTimeout(() => setProcessSteps([{ text: "Thinking...", status: "active" }]), 0),
      setTimeout(() => setProcessSteps([
        { text: "Thinking...", status: "complete" },
        { text: "Finding the goal...", status: "active" },
      ]), 1800),
      setTimeout(() => setProcessSteps([
        { text: "Thinking...", status: "complete" },
        { text: "Finding the goal...", status: "complete" },
        { text: "Crafting narrative...", status: "active" },
      ]), 3600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [processing]);

  useEffect(() => () => { Speech.stop(); }, []);

  const startHumanization = async () => {
    if (processing || !text.trim()) {
      if (!processing && !text.trim()) setErrorMessage("Enter some text before humanizing.");
      return;
    }

    setErrorMessage("");
    setResult(null);
    await Speech.stop();
    setSpeaking(false);
    setProcessSteps([]);
    Keyboard.dismiss();
    setProcessing(true);

    try {
      const response = await submitHumanizeRequest(text.trim(), selectedModel);
      setProcessSteps([
        { text: "Thinking...", status: "complete" },
        { text: "Finding the goal...", status: "complete" },
        { text: "Crafting narrative...", status: "complete" },
        { text: "Done.", status: "complete" },
      ]);
      setResult(response);
      onUsageChanged();
      setTimeout(() => {
        setProcessSteps([]);
        setProcessing(false);
      }, 650);
    } catch (error) {
      setProcessSteps([]);
      setProcessing(false);
      setErrorMessage(error.message || "Unable to humanize this text.");
      if (/free tier has ended|SUBSCRIPTION_REQUIRED/i.test(error.message || "")) onSubscriptionRequired();
    }
  };

  const copyOutput = async () => {
    const output = result?.humanized_text;
    if (!output) return;
    await Clipboard.setStringAsync(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const toggleOutputSpeech = async () => {
    const output = result?.humanized_text?.trim();
    if (!output) return;
    if (await Speech.isSpeakingAsync()) {
      await Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(output, {
      rate: 0.93,
      pitch: 1,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const borderColor = borderAnimation.interpolate({ inputRange: [0, 1], outputRange: [COLORS.border, COLORS.purple] });
  const shadowOpacity = borderAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.26] });

  return (
    <ScrollView ref={humanizerScrollRef} style={styles.mainScroll} contentContainerStyle={styles.viewContent} keyboardShouldPersistTaps="handled">
      <PageHeading title="Refine your narrative." subtitle="Advanced AI text humanization for professional & academic research." />
      <View style={styles.modeToggle}>
        <Pressable style={[styles.modeOption, displayedMode === "text" && styles.modeOptionActive]} onPress={() => setMode("text")} accessibilityRole="button"><Text style={[styles.modeOptionText, displayedMode === "text" && styles.modeOptionTextActive]}>Text Humanize</Text></Pressable>
        <Pressable style={[styles.modeOption, displayedMode === "document" && styles.modeOptionActive]} onPress={() => setMode("document")} accessibilityRole="button"><Text style={[styles.modeOptionText, displayedMode === "document" && styles.modeOptionTextActive]}>Document Humanize</Text></Pressable>
      </View>
      {displayedMode === "document" ? <DocumentHumanizerView documentFile={documentFile} setDocumentFile={setDocumentFile} job={documentJob} setJob={setDocumentJob} errorMessage={documentError} setErrorMessage={setDocumentError} selectedModel={selectedModel} setSelectedModel={setSelectedModel} models={models} userId={userId} onSubscriptionRequired={onSubscriptionRequired} onUsageChanged={onUsageChanged} /> : <>
      <Animated.View style={[styles.humanizerBox, processing && styles.humanizerBoxProcessing, { borderColor, shadowOpacity }]}>
        <TextInput
          value={text}
          onChangeText={handleTextChange}
          placeholder="Enter text or upload a document to humanize..."
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
          style={styles.humanizerInput}
          accessibilityLabel="Text to humanize"
        />
        <View style={styles.wordCountRow}>
          <Text style={[styles.wordCount, wordCount >= 200 && styles.wordCountLimit]}>{wordCount} / 200 words</Text>
        </View>
        <View style={styles.inputFooter}>
          <Pressable style={styles.modelSelect} accessibilityRole="button" accessibilityLabel="Select humanizer model" onPress={() => setModelMenuOpen(true)}>
            <Ionicons name="options-outline" size={16} color={COLORS.purple} />
            <Text style={styles.modelSelectText}>{selectedModel}</Text>
            <Ionicons name="chevron-down" size={15} color={COLORS.muted} />
          </Pressable>
          <Pressable style={[styles.submitButton, processing && styles.submitButtonProcessing]} disabled={processing} onPress={startHumanization}>
            {processing ? <Animated.View style={{ transform: [{ rotate: borderAnimation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}><Ionicons name="refresh" size={16} color="#FFFFFF" /></Animated.View> : <Ionicons name="sparkles" size={16} color="#FFFFFF" />}
            <Text style={styles.submitText}>{processing ? "Processing" : "Humanize"}</Text>
          </Pressable>
        </View>
      </Animated.View>
      {processSteps.length > 0 && (
        <View style={styles.processContainer}>
          {processSteps.map((step) => <ProcessStep key={step.text} text={step.text} status={step.status} />)}
        </View>
      )}
      {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      {!!result && (
        <View
          style={styles.resultContainer}
          onLayout={(event) => humanizerScrollRef.current?.scrollTo({ y: Math.max(0, event.nativeEvent.layout.y - 12), animated: true })}
        >
          <ScoreGauge score={result.final_ai_score ?? result.ai_score} />
          <View style={styles.resultMeta}>
            <Text style={styles.resultLabel}>Word count <Text style={styles.resultValue}>{outputWordCount}</Text></Text>
            <View style={styles.resultActions}>
              <Pressable style={[styles.speechIconButton, speaking && styles.speechIconButtonActive]} onPress={toggleOutputSpeech} accessibilityRole="button" accessibilityLabel={speaking ? "Stop reading humanized output" : "Read humanized output aloud"}>
                <Ionicons name={speaking ? "stop" : "volume-high-outline"} size={18} color={speaking ? "#FFFFFF" : COLORS.purple} />
              </Pressable>
              <Pressable style={styles.copyIconButton} onPress={copyOutput} accessibilityRole="button" accessibilityLabel="Copy humanized output">
                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={18} color={copied ? "#16A34A" : COLORS.purple} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.resultText}>{result.humanized_text || "No humanized text was returned."}</Text>
        </View>
      )}
      <Modal visible={modelMenuOpen} transparent animationType="fade" onRequestClose={() => setModelMenuOpen(false)}>
        <Pressable style={styles.modelBackdrop} onPress={() => setModelMenuOpen(false)}>
          <Pressable style={styles.modelMenu} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.modelMenuTitle}>Choose a model</Text>
            {models.map((model) => (
              <Pressable
                key={model.name}
                disabled={model.locked}
                style={[styles.modelOption, model.name === selectedModel && styles.modelOptionActive, model.locked && styles.modelOptionLocked]}
                onPress={() => {
                  setSelectedModel(model.name);
                  setModelMenuOpen(false);
                }}
              >
                <Text style={[styles.modelOptionText, model.name === selectedModel && styles.modelOptionTextActive, model.locked && styles.modelOptionTextLocked]}>{model.name}</Text>
                {model.locked ? <Ionicons name="lock-closed" size={15} color={COLORS.muted} /> : model.name === selectedModel && <Ionicons name="checkmark" size={18} color={COLORS.purple} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
      </>}
    </ScrollView>
  );
}

/* const FILES = [
  { name: "Q3_Market_Analysis_Humanized.docx", info: "Processed today at 10:42 AM • 2.4 MB", icon: "document-text-outline", color: "#6D28D9", background: "#F5F3FF" },
  { name: "Research_Abstract_Final.pdf", info: "Processed yesterday • 1.1 MB", icon: "document-text-outline", color: "#EF4444", background: "#FEE2E2" },
  { name: "Data_Summary_Notes.csv", info: "Processed Sep 12 • 450 KB", icon: "grid-outline", color: "#10B981", background: "#D1FAE5" },
]; */

function FilesView() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadFiles = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setErrorMessage("");
    try {
      const documents = await getStoredDocuments();
      setFiles(documents);
    } catch (error) {
      setErrorMessage(error.message || "Unable to load your documents.");
    } finally {
      setLoading(false);
      if (showRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    getStoredDocuments()
      .then((documents) => { if (active) setFiles(documents); })
      .catch((error) => { if (active) setErrorMessage(error.message || "Unable to load your documents."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <ScrollView style={styles.mainScroll} contentContainerStyle={styles.viewContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFiles(true)} tintColor={COLORS.purple} colors={[COLORS.purple]} />}>
      <PageHeading title="Your Documents" subtitle="Access previously humanized reports and files." />
      <View style={styles.filesContainer}>
        {loading && <Text style={styles.emptyFilesText}>Loading your documents...</Text>}
        {!loading && !errorMessage && files.length === 0 && <Text style={styles.emptyFilesText}>Your completed documents will appear here.</Text>}
        {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        {files.map((file) => (
          <Pressable key={file.id} style={styles.fileItem} onPress={() => saveDocumentToDevice(file.id, file.name).catch((error) => setErrorMessage(error.message || "Unable to save the document."))} accessibilityRole="button" accessibilityLabel={`Download ${file.name}`}>
            <View style={styles.fileInfo}>
              <View style={styles.fileIcon}><Ionicons name="document-text-outline" size={24} color={COLORS.purple} /></View>
              <View style={styles.fileDetails}><Text numberOfLines={2} style={styles.fileName}>{file.name}</Text><Text style={styles.fileMeta}>{file.wordCount} words | Completed {new Date(file.createdAt).toLocaleDateString()}</Text></View>
            </View>
            <Ionicons name="download-outline" size={22} color={COLORS.purple} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function formatBillingDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function ProfileView({ user, onLogout, onOpenAccount, onOpenBilling, onOpenPrivacy, onOpenReport }) {
  const settings = [
    ["settings-outline", "Account Settings", onOpenAccount],
    ["pie-chart-outline", "Usage & Billing", onOpenBilling],
    ["shield-checkmark-outline", "Privacy & Security", onOpenPrivacy],
    ["flag-outline", "Report a Problem", onOpenReport],
  ];

  return (
    <ScrollView style={styles.mainScroll} contentContainerStyle={styles.viewContent}>
      <PageHeading title="Account" subtitle="Manage your Sentistra workspace." />
      <View style={styles.profileCard}>
        <Pressable style={styles.avatar} onPress={onOpenAccount} accessibilityRole="button" accessibilityLabel="Open account settings"><ProfilePhoto photoVersion={user?.photoVersion} size={80} /></Pressable>
        <Text style={styles.profileName}>{user?.name || "Sentistra member"}</Text>
        <Text style={styles.profilePlan}>{user?.email || "Free Researcher Plan"}</Text>
        <View style={styles.settingsList}>
          {settings.map(([icon, label, onPress]) => (
            <Pressable key={label} style={styles.settingRow} onPress={onPress}>
              <Ionicons name={icon} size={19} color={COLORS.dark} /><Text style={styles.settingText}>{label}</Text><Ionicons name="chevron-forward" size={17} color={COLORS.muted} />
            </Pressable>
          ))}
          <Pressable style={styles.settingRow} onPress={onLogout}><Ionicons name="log-out-outline" size={19} color="#EF4444" /><Text style={[styles.settingText, styles.logoutText]}>Log Out</Text></Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, sessionReady, updateUser: updateStoredUser, logout: clearUserSession } = useAuth();
  const { width } = useWindowDimensions();
  const [activeView, setActiveView] = useState("humanizer");
  const [documentFile, setDocumentFile] = useState(null);
  const [documentJob, setDocumentJob] = useState(null);
  const [documentError, setDocumentError] = useState("");
  const [detectorJob, setDetectorJob] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState(null);
  const [selectedPlanKey, setSelectedPlanKey] = useState("monthly");
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingStatus, setBillingStatus] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState("");
  const isSmallScreen = width < 380;
  const [fontsLoaded] = useFonts({
    PlayfairDisplayItalic: PlayfairDisplay_500Medium_Italic,
  });

  useEffect(() => {
    if (sessionReady && !user) router.replace("/");
  }, [router, sessionReady, user]);

  useEffect(() => {
    if (!sessionReady || !user?.id) {
      setBillingStatus(null);
      return undefined;
    }
    let mounted = true;
    getSubscriptionStatus()
      .then((status) => { if (mounted) setBillingStatus(status); })
      .catch(() => { if (mounted) setBillingStatus(null); });
    return () => { mounted = false; };
  }, [sessionReady, user?.id]);

  useEffect(() => {
    if (!sessionReady || !user?.id) return undefined;
    let mounted = true;
    AsyncStorage.getItem(activeDocumentStorageKey(user.id)).then(async (jobId) => {
      if (!jobId) return;
      try {
        const storedJob = await getDocumentHumanizeStatus(jobId);
        if (mounted) setDocumentJob(storedJob);
      } catch (error) {
        if (mounted) {
          if (/document job not found/i.test(error.message || "")) {
            await AsyncStorage.removeItem(activeDocumentStorageKey(user.id));
            setDocumentJob(null);
            setDocumentError("No document today");
          } else {
            setDocumentError(error.message || "Unable to restore document progress.");
          }
        }
      }
    });
    return () => { mounted = false; };
  }, [sessionReady, user?.id]);

  useEffect(() => {
    const processing = documentJob?.status === "queued" || documentJob?.status === "processing";
    if (!documentJob?.job_id || !processing) return undefined;
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await getDocumentHumanizeStatus(documentJob.job_id);
        if (!cancelled) setDocumentJob((current) => ({ ...current, ...status }));
      } catch (error) {
        if (!cancelled) setDocumentError(error.message || "Unable to check document progress.");
      }
    };
    const timer = setTimeout(poll, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [documentJob]);

  useEffect(() => {
    if (!sessionReady || !user?.id) return undefined;
    let mounted = true;
    AsyncStorage.getItem(activeDetectorStorageKey(user.id)).then(async (jobId) => {
      if (!jobId) return;
      try {
        const storedJob = await getDocumentDetectionStatus(jobId);
        if (mounted) setDetectorJob(storedJob);
      } catch {
        await AsyncStorage.removeItem(activeDetectorStorageKey(user.id));
      }
    });
    return () => { mounted = false; };
  }, [sessionReady, user?.id]);

  useEffect(() => {
    const processing = detectorJob?.status === "queued" || detectorJob?.status === "processing";
    if (!detectorJob?.job_id || !processing) return undefined;
    let cancelled = false;
    const poll = async () => {
      try {
        const status = await getDocumentDetectionStatus(detectorJob.job_id);
        if (!cancelled) setDetectorJob((current) => ({ ...current, ...status }));
      } catch (error) {
        if (!cancelled) setDetectorJob((current) => ({ ...current, status: "failed", message: error.message || "Unable to check AI detection progress." }));
      }
    };
    const timer = setTimeout(poll, 2000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [detectorJob]);

  const logout = async () => {
    await clearUserSession();
    router.dismissAll();
    router.replace("/");
  };
  const openSubscription = async () => {
    setSubscriptionOpen(true);
    setSubscriptionError("");
    try {
      const plans = await getSubscriptionPlans();
      setSubscriptionPlans(plans);
      setSelectedPlanKey((current) => plans.some((plan) => plan.planKey === current) ? current : plans[0]?.planKey);
    }
    catch (error) { setSubscriptionError(error.message || "Unable to load plans."); }
  };
  const claimSubscription = async (planKey) => {
    if (checkoutProcessing) return;
    setCheckoutProcessing(true);
    setSubscriptionError("");
    try {
      await beginCashfreeUpgrade({
        planKey,
        onVerified: (result) => {
          clearCashfreeCallback();
          setCheckoutProcessing(false);
          setSubscriptionOpen(false);
          getSubscriptionStatus().then(setBillingStatus).catch(() => {});
          Alert.alert("Plan unlocked", result.message || "Your Sentistra plan is now active.");
        },
        onFailure: (message) => {
          clearCashfreeCallback();
          setCheckoutProcessing(false);
          setSubscriptionError(message);
        },
      });
    } catch (error) {
      clearCashfreeCallback();
      setCheckoutProcessing(false);
      setSubscriptionError(error.message || "Unable to open secure checkout.");
    }
  };

  const openBilling = async () => {
    setBillingOpen(true);
    setBillingLoading(true);
    setBillingError("");
    try {
      setBillingStatus(await getSubscriptionStatus());
    } catch (error) {
      setBillingError(error.message || "Unable to load billing status.");
    } finally {
      setBillingLoading(false);
    }
  };

  const openAccountSettings = () => {
    setAccountName(user?.name || "");
    setAccountPhone(user?.phone || "");
    setAccountError("");
    setAccountOpen(true);
  };

  const openPrivacyPolicy = () => setPrivacyOpen(true);
  const openReportProblem = () => setReportOpen(true);

  const changeProfilePhoto = async () => {
    if (photoBusy) return;
    setAccountError("");
    setPhotoBusy(true);
    try {
      const updatedUser = await pickAndUploadProfilePhoto();
      if (updatedUser) await updateStoredUser(updatedUser);
    } catch (error) {
      setAccountError(error.message || "Unable to update your profile photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const confirmRemoveProfilePhoto = () => {
    if (photoBusy) return;
    Alert.alert("Remove profile photo?", "Your photo will be deleted from Sentistra.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setAccountError("");
          setPhotoBusy(true);
          try {
            await updateStoredUser(await removeProfilePhoto());
          } catch (error) {
            setAccountError(error.message || "Unable to remove your profile photo.");
          } finally {
            setPhotoBusy(false);
          }
        },
      },
    ]);
  };

  const saveAccountSettings = async () => {
    if (accountSaving) return;
    setAccountSaving(true);
    setAccountError("");
    try {
      const updatedUser = await updateMyAccount({ name: accountName, phone: accountPhone });
      await updateStoredUser(updatedUser);
      setAccountOpen(false);
      Alert.alert("Account updated", "Your name and phone number have been saved.");
    } catch (error) {
      setAccountError(error.message || "Unable to save account changes.");
    } finally {
      setAccountSaving(false);
    }
  };

  const navigateToDashboardView = (view) => {
    setSubscriptionOpen(false);
    setBillingOpen(false);
    setAccountOpen(false);
    setPrivacyOpen(false);
    setReportOpen(false);
    setActiveView(view);
  };

  useEffect(() => {
    const closeOpenSubpage = () => {
      if (subscriptionOpen) { setSubscriptionOpen(false); return true; }
      if (billingOpen) { setBillingOpen(false); return true; }
      if (accountOpen) { setAccountOpen(false); return true; }
      if (privacyOpen) { setPrivacyOpen(false); return true; }
      if (reportOpen) { setReportOpen(false); return true; }
      return false;
    };
    const listener = BackHandler.addEventListener("hardwareBackPress", closeOpenSubpage);
    return () => listener.remove();
  }, [accountOpen, billingOpen, privacyOpen, reportOpen, subscriptionOpen]);

  useEffect(() => () => clearCashfreeCallback(), []);

  // The server owns the free-use count; re-read it after a use is spent or given back.
  const refreshBillingStatus = () => {
    getSubscriptionStatus().then(setBillingStatus).catch(() => {});
  };

  // A failed or cancelled document job returns its free use on the server.
  const documentJobStatus = documentJob?.status;
  const detectorJobStatus = detectorJob?.status;
  useEffect(() => {
    if (["failed", "cancelled"].includes(documentJobStatus) || ["failed", "cancelled"].includes(detectorJobStatus)) {
      getSubscriptionStatus().then(setBillingStatus).catch(() => {});
    }
  }, [documentJobStatus, detectorJobStatus]);
  const hasPaidPlan = billingStatus?.paid === true;
  const isOnFreeTier = !hasPaidPlan && (billingStatus ? billingStatus.tier === true : user?.tier === true);
  const freeUsesRemaining = billingStatus?.free_uses_remaining ?? user?.freeUsesRemaining;
  const freeUsesLimit = billingStatus?.free_uses_limit ?? user?.freeUsesLimit;
  const freeTierMessage = typeof freeUsesRemaining === "number" && typeof freeUsesLimit === "number"
    ? `${freeUsesRemaining} of ${freeUsesLimit} free uses left`
    : "You are on the free tier";
  const requiresUpgrade = billingStatus?.paid === false && billingStatus?.tier === false;
  const renderView = () => {
    if (subscriptionOpen) return <SubscriptionPage checkoutProcessing={checkoutProcessing} errorMessage={subscriptionError} onBack={() => setSubscriptionOpen(false)} onClaim={claimSubscription} onSelectPlan={setSelectedPlanKey} plans={subscriptionPlans} selectedPlanKey={selectedPlanKey} />;
    if (billingOpen) return <BillingPage billingError={billingError} billingLoading={billingLoading} billingStatus={billingStatus} onBack={() => setBillingOpen(false)} />;
    if (accountOpen) return <AccountSettingsPage accountError={accountError} accountName={accountName} accountPhone={accountPhone} accountSaving={accountSaving} photoBusy={photoBusy} photoVersion={user?.photoVersion} onBack={() => setAccountOpen(false)} onChangePhoto={changeProfilePhoto} onNameChange={setAccountName} onPhoneChange={setAccountPhone} onRemovePhoto={confirmRemoveProfilePhoto} onSave={saveAccountSettings} />;
    if (privacyOpen) return <PrivacyPolicyPage onBack={() => setPrivacyOpen(false)} />;
    if (reportOpen) return <ReportProblemPage onBack={() => setReportOpen(false)} />;
    if (activeView === "files") return <FilesView />;
    if (activeView === "detector") return <AIDetectorView detectorJob={detectorJob} setDetectorJob={setDetectorJob} userId={user?.id} onSubscriptionRequired={openSubscription} onUsageChanged={refreshBillingStatus} />;
    if (activeView === "profile") return <ProfileView user={user} onLogout={logout} onOpenAccount={openAccountSettings} onOpenBilling={openBilling} onOpenPrivacy={openPrivacyPolicy} onOpenReport={openReportProblem} />;
    return <HumanizerView documentFile={documentFile} setDocumentFile={setDocumentFile} documentJob={documentJob} setDocumentJob={setDocumentJob} documentError={documentError} setDocumentError={setDocumentError} userId={user?.id} onSubscriptionRequired={openSubscription} onUsageChanged={refreshBillingStatus} />;
  };

  if (!fontsLoaded || !sessionReady || !user) return null;

  return (
    <SafeAreaView style={styles.safeRoot} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <View style={styles.logoContainer}><Image source={require("../assets/images/app_logo.png")} style={styles.logoImage} /><Text style={styles.logoText}>Sentistra.io</Text></View>
          <Pressable style={[styles.upgradeButton, hasPaidPlan && styles.plusButton, isSmallScreen && styles.upgradeButtonCompact]} onPress={hasPaidPlan ? openBilling : openSubscription} accessibilityLabel={hasPaidPlan ? "View Sentistra Plus billing" : "Upgrade Sentistra"}>
            {hasPaidPlan ? <MaterialCommunityIcons name="crown" size={17} color="#FFFFFF" /> : <Ionicons name="flash" size={15} color="#92400E" />}{!isSmallScreen && <Text style={[styles.upgradeText, hasPaidPlan && styles.plusText]}>{hasPaidPlan ? "Plus" : "Upgrade"}</Text>}
          </Pressable>
        </View>
        {isOnFreeTier && <View style={styles.freeTierBanner} accessibilityRole="text"><View style={styles.statusBannerContent}><Ionicons name="time-outline" size={17} color="#92400E" /><Text style={styles.freeTierBannerText}>{freeTierMessage}</Text></View></View>}
        {requiresUpgrade && <Pressable style={styles.upgradeRequiredBanner} onPress={openSubscription} accessibilityRole="button" accessibilityLabel="Upgrade to Sentistra Plus"><View style={styles.statusBannerContent}><Ionicons name="lock-closed-outline" size={17} color="#B42318" /><Text style={styles.upgradeRequiredBannerText}>You have used all your free uses. Upgrade to Plus to continue.</Text></View><Ionicons name="chevron-forward" size={18} color="#B42318" style={styles.statusBannerChevron} /></Pressable>}
        <View style={styles.content}>{renderView()}</View>
        <BottomNavigation activeView={activeView} onNavigate={navigateToDashboardView} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeRoot: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: { minHeight: 62, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  logoContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoImage: { width: 26, height: 26, borderRadius: 7 },
  logoText: { color: COLORS.dark, fontSize: 20, fontWeight: "600", letterSpacing: -0.5 },
  upgradeButton: { minHeight: 36, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: "#FCD34D", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FEF3C7" },
  plusButton: { borderColor: "#6D28D9", backgroundColor: "#6D28D9", shadowColor: "#6D28D9", shadowOpacity: 0.22, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  upgradeButtonCompact: { width: 38, paddingHorizontal: 0, justifyContent: "center" },
  upgradeText: { color: "#92400E", fontSize: 14, fontWeight: "600" },
  plusText: { color: "#FFFFFF", fontWeight: "700" },
  freeTierBanner: { minHeight: 44, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#FEF3C7", borderBottomWidth: 1, borderBottomColor: "#FCD34D" },
  upgradeRequiredBanner: { minHeight: 52, paddingHorizontal: 44, alignItems: "center", justifyContent: "center", backgroundColor: "#FEE2E2", borderBottomWidth: 1, borderBottomColor: "#FECACA", position: "relative" },
  statusBannerContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  freeTierBannerText: { color: "#92400E", fontSize: 13, fontWeight: "700", textAlign: "center" },
  upgradeRequiredBannerText: { color: "#B42318", fontSize: 13, lineHeight: 18, fontWeight: "700", textAlign: "center" },
  statusBannerChevron: { position: "absolute", right: 18 },
  subscriptionScreen: { flex: 1, backgroundColor: COLORS.background },
  subscriptionHeader: { minHeight: 62, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  subscriptionContent: { flexGrow: 1, padding: 20, justifyContent: "center" },
  subscriptionHeading: { color: COLORS.dark, fontSize: 22, fontWeight: "800" },
  subscriptionCard: { padding: 20, borderWidth: 1.5, borderColor: "#C4B5FD", borderRadius: 26, backgroundColor: "#FFFFFF" },
  subscriptionNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  subscriptionName: { color: COLORS.dark, fontSize: 16, fontWeight: "800" },
  subscriptionBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: "#F5F3FF", color: COLORS.purple, fontSize: 10, fontWeight: "800" },
  subscriptionTitle: { marginTop: 14, color: "#030712", fontSize: 26, fontWeight: "800" },
  subscriptionDescription: { marginTop: 8, color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  subscriptionPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 18 },
  subscriptionOldPrice: { color: "#9CA3AF", fontSize: 20, fontWeight: "700", textDecorationLine: "line-through" },
  subscriptionPrice: { color: "#030712", fontSize: 38, fontWeight: "800" },
  subscriptionInterval: { color: COLORS.muted, fontSize: 14 },
  subscriptionClaim: { height: 50, marginTop: 16, borderRadius: 25, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", backgroundColor: "#7C3AED" },
  subscriptionClaimDisabled: { opacity: 0.65 },
  subscriptionClaimText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  subscriptionFeature: { marginTop: 16, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  subscriptionFeatureText: { flex: 1, color: "#1F2937", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  planOptions: { gap: 10, marginBottom: 16 },
  planOption: { minHeight: 64, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 16, backgroundColor: COLORS.surface, flexDirection: "row", alignItems: "center", gap: 12 },
  planOptionSelected: { borderColor: COLORS.purple, backgroundColor: COLORS.purpleLight },
  planOptionCopy: { flex: 1 },
  planOptionLabel: { color: COLORS.dark, fontSize: 15, fontWeight: "800" },
  planOptionMonthly: { marginTop: 2, color: COLORS.muted, fontSize: 12, fontWeight: "600" },
  planOptionPrices: { alignItems: "flex-end" },
  planOptionOldPrice: { color: "#9CA3AF", fontSize: 12, fontWeight: "600", textDecorationLine: "line-through" },
  planOptionPrice: { color: COLORS.dark, fontSize: 16, fontWeight: "800" },
  subscriptionPromo: { marginTop: 18, color: "#6B7280", fontSize: 11, lineHeight: 16 },
  billingScreen: { flex: 1, backgroundColor: COLORS.background },
  fullScreenScroll: { flex: 1 },
  billingHeader: { minHeight: 62, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  billingCloseButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  billingPageTitle: { color: COLORS.dark, fontSize: 18, fontWeight: "800" },
  billingHeaderSpacer: { width: 40 },
  billingContent: { flexGrow: 1, padding: 20, justifyContent: "flex-start" },
  billingCycleCard: { padding: 18, borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 22, backgroundColor: "#FCFBFF" },
  billingCycleHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  billingEyebrow: { color: COLORS.purple, fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  billingStatus: { marginTop: 4, color: COLORS.dark, fontSize: 18, fontWeight: "800" },
  billingStatusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, backgroundColor: "#DCFCE7" },
  billingStatusBadgeExpired: { backgroundColor: "#F3F4F6" },
  billingStatusBadgeText: { color: "#15803D", fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  billingStatusBadgeTextExpired: { color: COLORS.muted },
  billingProgressTrack: { height: 10, marginTop: 22, borderRadius: 5, overflow: "hidden", backgroundColor: "#E9E5F8" },
  billingProgressFill: { height: "100%", minWidth: 3, borderRadius: 5, backgroundColor: COLORS.purple },
  billingProgressLabels: { marginTop: 8, flexDirection: "row", justifyContent: "space-between" },
  billingProgressLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "600" },
  billingProgressValue: { color: COLORS.purple, fontSize: 12, fontWeight: "800" },
  billingTimeline: { marginTop: 24 },
  billingTimelineItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  billingTimelineDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#EDE9FE" },
  billingTimelineDotEnd: { backgroundColor: COLORS.purple },
  billingTimelineLine: { width: 2, height: 20, marginLeft: 15, backgroundColor: "#DDD6FE" },
  billingTimelineCopy: { flex: 1 },
  billingTimelineLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  billingTimelineDate: { marginTop: 2, color: COLORS.dark, fontSize: 13, fontWeight: "600" },
  billingSupportText: { marginTop: 22, color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  billingEmpty: { alignItems: "center", paddingHorizontal: 28, paddingVertical: 38, borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 22, backgroundColor: "#FCFBFF" },
  billingEmptyTitle: { marginTop: 12, color: COLORS.dark, fontSize: 17, fontWeight: "800" },
  billingEmptyText: { marginTop: 7, color: COLORS.muted, fontSize: 13, lineHeight: 19, textAlign: "center" },
  skeletonBlock: { overflow: "hidden", borderRadius: 7, backgroundColor: "#ECE9F4" },
  skeletonShimmer: { position: "absolute", top: 0, bottom: 0, width: 110, backgroundColor: "rgba(255,255,255,0.72)" },
  skeletonEyebrow: { width: 66, height: 10 },
  skeletonHeading: { width: 158, height: 20, marginTop: 8 },
  skeletonBadge: { width: 56, height: 24, borderRadius: 12 },
  skeletonProgress: { width: "100%", height: 10, marginTop: 22, borderRadius: 5 },
  skeletonProgressLabel: { width: 116, height: 12 },
  skeletonPercentage: { width: 28, height: 12 },
  skeletonAvatar: { width: 32, height: 32, borderRadius: 16 },
  skeletonTimelineLabel: { width: 84, height: 10 },
  skeletonTimelineDate: { width: 172, height: 13, marginTop: 7 },
  skeletonSupport: { width: "76%", height: 12, marginTop: 22 },
  accountContent: { flexGrow: 1, padding: 20, justifyContent: "center" },
  accountSettingsCard: { padding: 22, borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 22, backgroundColor: COLORS.surface },
  photoEditor: { flexDirection: "row", alignItems: "center", gap: 16, paddingBottom: 20, marginBottom: 2, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  photoEditorAvatar: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.purpleLight },
  photoEditorBadge: { position: "absolute", right: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: COLORS.surface, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.purple },
  photoEditorActions: { flex: 1 },
  photoEditorTitle: { color: COLORS.dark, fontSize: 16, fontWeight: "800" },
  photoEditorHint: { marginTop: 4, color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  photoEditorButtons: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoButton: { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.purpleLight },
  photoButtonText: { color: COLORS.purple, fontSize: 13, fontWeight: "700" },
  photoRemoveButton: { backgroundColor: "#FEF2F2" },
  photoRemoveText: { color: "#B91C1C" },
  reportCategories: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reportCategory: { minHeight: 38, paddingHorizontal: 12, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 19, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.surface },
  reportCategorySelected: { borderColor: COLORS.purple, backgroundColor: COLORS.purpleLight },
  reportCategoryText: { color: COLORS.dark, fontSize: 13, fontWeight: "600" },
  reportCategoryTextSelected: { color: COLORS.purple },
  reportInput: { minHeight: 140, paddingTop: 12, paddingBottom: 12, lineHeight: 21 },
  reportCounter: { marginTop: 6, alignSelf: "flex-end", color: COLORS.muted, fontSize: 11 },
  reportListTitle: { marginTop: 28, marginBottom: 12, color: COLORS.dark, fontSize: 18, fontWeight: "800" },
  reportEmpty: { color: COLORS.muted, fontSize: 14, lineHeight: 20 },
  reportCard: { marginBottom: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, backgroundColor: COLORS.surface },
  reportCardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  reportTicket: { color: COLORS.dark, fontSize: 14, fontWeight: "800", letterSpacing: 0.4 },
  reportStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  reportStatusText: { fontSize: 12, fontWeight: "700" },
  reportMeta: { marginTop: 4, color: COLORS.muted, fontSize: 12 },
  reportDescription: { marginTop: 10, color: COLORS.dark, fontSize: 14, lineHeight: 21 },
  reportReply: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: COLORS.purpleLight },
  reportReplyLabel: { color: COLORS.purple, fontSize: 12, fontWeight: "800" },
  reportReplyText: { marginTop: 4, color: COLORS.dark, fontSize: 14, lineHeight: 20 },
  accountSettingsTitle: { marginTop: 18, color: COLORS.dark, fontSize: 21, fontWeight: "800" },
  accountSettingsText: { marginTop: 7, color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  accountLabel: { marginTop: 22, color: COLORS.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  accountInput: { minHeight: 50, marginTop: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, color: COLORS.dark, fontSize: 15, backgroundColor: "#FFFFFF" },
  accountError: { marginTop: 14, color: "#B91C1C", fontSize: 13, lineHeight: 19 },
  accountSaveButton: { minHeight: 50, marginTop: 24, borderRadius: 25, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.purple },
  accountSaveButtonDisabled: { opacity: 0.65 },
  accountSaveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  privacyCard: { padding: 20, borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 22, backgroundColor: COLORS.surface },
  privacyIntro: { paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: "#EDE9FE", flexDirection: "row", alignItems: "center", gap: 12 },
  privacyIntroCopy: { flex: 1 },
  privacyIntroTitle: { color: COLORS.dark, fontSize: 17, fontWeight: "800" },
  privacyEffective: { marginTop: 3, color: COLORS.muted, fontSize: 12 },
  privacyLead: { marginTop: 18, color: COLORS.muted, fontSize: 13, lineHeight: 20 },
  privacySection: { marginTop: 23 },
  privacySectionTitle: { color: COLORS.dark, fontSize: 15, lineHeight: 21, fontWeight: "800" },
  privacySectionText: { marginTop: 7, color: "#4B5563", fontSize: 13, lineHeight: 21 },
  content: { flex: 1 },
  mainScroll: { flex: 1 },
  viewContent: { width: "100%", maxWidth: 820, alignSelf: "center", paddingHorizontal: 20, paddingTop: 32, paddingBottom: 28 },
  subpageContent: { width: "100%", maxWidth: 820, alignSelf: "center", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28 },
  subpageBackButton: { minHeight: 38, marginBottom: 18, paddingHorizontal: 12, borderRadius: 19, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.purpleLight },
  subpageBackText: { color: COLORS.purple, fontSize: 13, fontWeight: "700" },
  heading: { alignItems: "center", marginBottom: 30 },
  headingTitle: { color: COLORS.dark, fontSize: 30, lineHeight: 38, fontFamily: "PlayfairDisplayItalic", textAlign: "center", letterSpacing: -0.5 },
  headingSubtitle: { maxWidth: 360, marginTop: 9, color: COLORS.muted, fontSize: 14, lineHeight: 21, fontWeight: "300", textAlign: "center" },
  modeToggle: { alignSelf: "center", marginBottom: 22, padding: 4, borderRadius: 999, flexDirection: "row", backgroundColor: "#F4F5F7" },
  modeOption: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 999 },
  modeOptionActive: { backgroundColor: COLORS.surface, shadowColor: "#000000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  modeOptionText: { color: "#475569", fontSize: 12, fontWeight: "500" },
  modeOptionTextActive: { color: COLORS.purple },
  documentView: { width: "100%" },
  documentPicker: { width: "100%", minHeight: 210, padding: 24, borderWidth: 1, borderColor: "#DDD6FE", borderStyle: "dashed", borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.purpleLight },
  documentPickerTitle: { maxWidth: "100%", marginTop: 14, color: COLORS.dark, fontSize: 16, fontWeight: "600", textAlign: "center" },
  documentPickerText: { marginTop: 7, color: COLORS.muted, fontSize: 13, textAlign: "center" },
  documentAction: { minHeight: 44, marginTop: 16, borderRadius: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.purple },
  documentProgress: { width: "100%", marginTop: 18, padding: 18, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, backgroundColor: COLORS.surface },
  documentProgressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  documentProgressTitle: { flex: 1, color: COLORS.dark, fontSize: 13, fontWeight: "600" },
  documentProgressValue: { color: COLORS.purple, fontSize: 13, fontWeight: "700" },
  progressTrack: { height: 7, marginTop: 14, overflow: "hidden", borderRadius: 4, backgroundColor: "#EDE9FE" },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: COLORS.purple },
  documentProgressText: { marginTop: 9, color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  cancelDocumentButton: { minHeight: 38, marginTop: 14, paddingHorizontal: 13, borderWidth: 1, borderColor: "#FECACA", borderRadius: 19, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: "#FEF2F2" },
  cancelDocumentText: { color: "#B91C1C", fontSize: 13, fontWeight: "600" },
  documentReady: { width: "100%", marginTop: 18, padding: 15, borderWidth: 1, borderColor: "#BBF7D0", borderRadius: 16, flexDirection: "row", alignItems: "center", backgroundColor: "#F0FDF4" },
  documentCompleteSection: { width: "100%" },
  documentScoreResult: { width: "100%", marginTop: 16, padding: 14, borderWidth: 1, borderColor: "#E9D5FF", borderRadius: 18, backgroundColor: COLORS.surface },
  documentReadyCopy: { flex: 1, marginLeft: 10 },
  documentReadyTitle: { color: "#166534", fontSize: 14, fontWeight: "700" },
  documentFailed: { width: "100%", marginTop: 18, padding: 15, borderWidth: 1, borderColor: "#FECACA", borderRadius: 16, flexDirection: "row", alignItems: "center", backgroundColor: "#FEF2F2" },
  documentFailedTitle: { color: "#991B1B", fontSize: 14, fontWeight: "700" },
  downloadButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.purple },
  humanizerBox: { width: "100%", borderWidth: 1, borderColor: COLORS.border, borderRadius: 24, overflow: "hidden", backgroundColor: COLORS.surface, shadowColor: "#000000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  humanizerBoxProcessing: { shadowColor: COLORS.purple, shadowRadius: 16, elevation: 5 },
  humanizerInput: { width: "100%", minHeight: 180, padding: 22, color: COLORS.dark, fontSize: 16, lineHeight: 26 },
  detectorBox: { width: "100%", borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, overflow: "hidden", backgroundColor: COLORS.surface },
  detectorInput: { width: "100%", minHeight: 210, padding: 20, color: COLORS.dark, fontSize: 16, lineHeight: 25 },
  detectorFooter: { minHeight: 62, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  detectButton: { minHeight: 38, paddingHorizontal: 15, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.purple },
  detectorOr: { marginVertical: 17, color: COLORS.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1, textAlign: "center" },
  detectorUpload: { width: "100%", minHeight: 150, padding: 20, borderWidth: 1, borderColor: "#DDD6FE", borderStyle: "dashed", borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.purpleLight },
  detectorUploadTitle: { marginTop: 10, color: COLORS.dark, fontSize: 15, fontWeight: "600" },
  detectorUploadText: { marginTop: 6, color: COLORS.muted, fontSize: 12 },
  detectorResult: { width: "100%", marginTop: 22, padding: 18, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, backgroundColor: COLORS.surface },
  detectorMeta: { paddingTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reportDownloadButton: { minHeight: 42, marginTop: 16, borderRadius: 21, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.purple },
  wordCountRow: { paddingHorizontal: 22, paddingBottom: 10, alignItems: "flex-end" },
  wordCount: { color: COLORS.muted, fontSize: 12, fontWeight: "500" },
  wordCountLimit: { color: "#DC2626" },
  inputFooter: { minHeight: 62, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FDFDFD" },
  modelSelect: { minHeight: 34, maxWidth: 164, paddingHorizontal: 10, borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 17, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.purpleLight },
  modelSelectText: { flexShrink: 1, color: COLORS.purple, fontSize: 12, fontWeight: "600" },
  submitButton: { minHeight: 38, paddingHorizontal: 15, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.purple },
  submitButtonProcessing: { opacity: 0.7 },
  submitText: { color: "#FFFFFF", fontSize: 14, fontWeight: "500" },
  processContainer: { width: "100%", marginTop: 24, paddingHorizontal: 20, gap: 16 },
  processStep: { minHeight: 22, flexDirection: "row", alignItems: "center", gap: 12 },
  processText: { color: COLORS.muted, fontSize: 15, lineHeight: 21, fontWeight: "300" },
  errorText: { width: "100%", marginTop: 18, color: "#DC2626", fontSize: 13, lineHeight: 19, textAlign: "center" },
  noDocumentText: { width: "100%", marginTop: 18, color: "#6B7280", fontSize: 13, lineHeight: 19, textAlign: "center" },
  resultContainer: { width: "100%", marginTop: 24, padding: 20, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, backgroundColor: COLORS.surface },
  scoreGauge: { width: "100%", marginTop: -8, marginBottom: -4, alignItems: "center" },
  resultMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  resultActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  copyIconButton: { width: 34, height: 34, borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.purpleLight },
  speechIconButton: { width: 34, height: 34, borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.purpleLight },
  speechIconButtonActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purple },
  resultLabel: { color: COLORS.muted, fontSize: 13 },
  resultValue: { color: COLORS.dark, fontWeight: "700" },
  resultText: { marginTop: 18, color: COLORS.dark, fontSize: 16, lineHeight: 26 },
  card: { width: "100%", padding: 28, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, alignItems: "center", backgroundColor: COLORS.surface, shadowColor: "#000000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  copyText: { color: "#FFFFFF", fontSize: 13, fontWeight: "500" },
  modelBackdrop: { flex: 1, padding: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(17,24,39,0.3)" },
  modelMenu: { width: "100%", maxWidth: 340, padding: 16, borderRadius: 16, backgroundColor: COLORS.surface, shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5 },
  modelMenuTitle: { marginBottom: 8, color: COLORS.dark, fontSize: 15, fontWeight: "600" },
  modelOption: { minHeight: 46, paddingHorizontal: 12, borderRadius: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modelOptionActive: { backgroundColor: COLORS.purpleLight },
  modelOptionLocked: { opacity: 0.58 },
  modelOptionText: { color: COLORS.dark, fontSize: 13 },
  modelOptionTextActive: { color: COLORS.purple, fontWeight: "600" },
  modelOptionTextLocked: { color: COLORS.muted },
  documentModelPanel: { width: "100%", marginTop: 14, padding: 14, borderWidth: 1, borderColor: "#E9E2FF", borderRadius: 14, backgroundColor: "#FCFBFF" },
  documentModelHeading: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  documentModelLabel: { color: COLORS.dark, fontSize: 12, fontWeight: "700", letterSpacing: 0.2, textTransform: "uppercase" },
  documentModelSelect: { minHeight: 58, paddingHorizontal: 13, borderWidth: 1, borderColor: "#DDD6FE", borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, backgroundColor: COLORS.surface },
  documentModelSelectDisabled: { opacity: 0.6 },
  documentModelCopy: { flex: 1, minWidth: 0 },
  documentModelName: { color: COLORS.purple, fontSize: 15, fontWeight: "700" },
  documentModelDescription: { marginTop: 3, color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  filesContainer: { width: "100%" },
  emptyFilesText: { paddingVertical: 28, color: COLORS.muted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  fileItem: { width: "100%", minHeight: 78, marginBottom: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, backgroundColor: COLORS.surface },
  fileInfo: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  fileIcon: { width: 48, height: 48, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  fileDetails: { flex: 1, minWidth: 0 },
  fileName: { color: COLORS.dark, fontSize: 14, lineHeight: 19, fontWeight: "500" },
  fileMeta: { marginTop: 4, color: COLORS.muted, fontSize: 11, lineHeight: 16 },
  profileCard: { width: "100%", padding: 26, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, alignItems: "center", backgroundColor: COLORS.surface },
  avatar: { width: 80, height: 80, marginBottom: 15, borderRadius: 40, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.purpleLight },
  profileName: { color: COLORS.dark, fontSize: 22, fontWeight: "600", textAlign: "center" },
  profilePlan: { marginTop: 5, color: COLORS.muted, fontSize: 14, textAlign: "center" },
  settingsList: { width: "100%", marginTop: 22, borderTopWidth: 1, borderTopColor: COLORS.border },
  settingRow: { minHeight: 54, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: "row", alignItems: "center", gap: 12 },
  settingText: { flex: 1, color: COLORS.dark, fontSize: 14 },
  logoutText: { color: "#EF4444" },
  bottomNav: { minHeight: 76, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 7, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: "row", alignItems: "center", justifyContent: "space-around", backgroundColor: "rgba(255,255,255,0.97)" },
  navItem: { minWidth: 56, alignItems: "center", justifyContent: "center", gap: 3, transform: [{ translateY: 0 }, { scale: 1 }], zIndex: 1 },
  navItemActive: { transform: [{ translateY: -8 }, { scale: 1.12 }], zIndex: 2 },
  navIcon: { width: 40, height: 38, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  navIconActive: { backgroundColor: COLORS.purple, shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5 },
  navLabel: { color: COLORS.muted, fontSize: 10, textAlign: "center" },
  navLabelActive: { color: COLORS.purple, fontWeight: "700" },
});

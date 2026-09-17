// The three real "frontend" file types a project might use, shown as
// pills matching the 12 backend language pills. HTML/CSS is the web
// frontend (used by the web/CLI backend languages); Android XML and iOS
// Storyboard are what Android and iOS actually use INSTEAD of HTML/CSS --
// neither platform renders a web page, so neither has an HTML/CSS
// equivalent, they have their own real UI-definition file format.
//
// Every id defined here is a real id the corresponding backend language
// tab reads by name -- amountInput/emailInput/phoneInput/buyButton/resultText
// on Android, amountField/emailField/phoneField/buyButton/resultLabel (+ the
// createPaymentTapped: action) on iOS. Change an id here and the matching
// findViewById/@IBOutlet in the Java/Kotlin/Swift tabs breaks, on purpose --
// that coupling is what makes these real, not illustrative.
//
// {{PUBLISHABLE_KEY}} is not used in the XML/Storyboard files -- neither
// platform's UI-definition file talks to Konduyt directly (the Activity/
// ViewController code does that, shown in the Java/Kotlin/Swift backend
// tabs), so there's nothing to substitute in either one.

export const ANDROID_LAYOUT_XML = `<?xml version="1.0" encoding="utf-8"?>
<!-- app/src/main/res/layout/activity_main.xml
     The real Android UI-definition file — what MainActivity's
     setContentView(R.layout.activity_main) actually loads. This is
     Android's equivalent of HTML/CSS: a real, separate file describing
     the screen, not something written inline in the Activity code.
     Every id below (amountInput, emailInput, phoneInput, buyButton,
     resultText) is read by name in the Java/Kotlin backend tabs via
     findViewById. -->
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:padding="24dp">

    <EditText
        android:id="@+id/amountInput"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:inputType="number"
        android:hint="Amount (e.g. a donation, or leave for the fixed price)"
        android:layout_marginBottom="8dp" />

    <EditText
        android:id="@+id/emailInput"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:inputType="textEmailAddress"
        android:hint="customer@example.com"
        android:layout_marginBottom="8dp" />

    <!-- Digits only. Android's phone input type would also accept
         + - ( ) and spaces, and the rule everywhere else in this product is
         that the field holds digits and nothing else. maxLength mirrors the
         web page's E.164 cap. -->
    <EditText
        android:id="@+id/phoneInput"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:inputType="number"
        android:digits="0123456789"
        android:maxLength="15"
        android:hint="Phone (optional — for mobile money)"
        android:layout_marginBottom="16dp" />

    <Button
        android:id="@+id/buyButton"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Buy now" />

    <TextView
        android:id="@+id/resultText"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="16dp"
        android:textSize="14sp" />

</LinearLayout>`;

export const IOS_STORYBOARD_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Main.storyboard
     iOS's classic UIKit equivalent of HTML/CSS — a real, separate XML
     file describing the screen. Every outlet and action below
     (amountField, emailField, phoneField, buyButton, resultLabel, and the
     createPaymentTapped: action) is connected by name to the same
     view controller in the Swift tab, which is UIKit for that reason. -->
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="22505" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none" useAutolayout="YES" useTraitCollections="YES" useSafeAreas="YES" initialViewController="main-vc">
    <dependencies>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="22504"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
    </dependencies>
    <scenes>
        <scene sceneID="main-scene">
            <objects>
                <viewController storyboardIdentifier="main-vc" id="main-vc" customClass="ViewController" customModule="KonduytDemo" customModuleProvider="target" sceneMemberID="viewController">
                    <view key="view" contentMode="scaleToFill" id="main-view">
                        <rect key="frame" x="0.0" y="0.0" width="393" height="852"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <subviews>
                            <textField opaque="NO" contentMode="scaleToFill" fixedFrame="YES" translatesAutoresizingMaskIntoConstraints="NO" id="amountField">
                                <rect key="frame" x="24" y="120" width="345" height="34"/>
                                <autoresizingMask key="autoresizingMask" flexibleMaxX="YES" flexibleMaxY="YES"/>
                                <textFieldCell key="cell" scrollable="YES" lineBreakMode="clipping" sendsActionOnEndEditing="YES" title="Amount" id="amountField-cell">
                                    <font key="font" metaFont="system"/>
                                    <color key="textColor" name="labelColor" catalog="System" colorSpace="catalog"/>
                                    <color key="backgroundColor" name="textBackgroundColor" catalog="System" colorSpace="catalog"/>
                                </textFieldCell>
                            </textField>
                            <textField opaque="NO" contentMode="scaleToFill" fixedFrame="YES" translatesAutoresizingMaskIntoConstraints="NO" id="emailField">
                                <rect key="frame" x="24" y="170" width="345" height="34"/>
                                <autoresizingMask key="autoresizingMask" flexibleMaxX="YES" flexibleMaxY="YES"/>
                                <textFieldCell key="cell" scrollable="YES" lineBreakMode="clipping" sendsActionOnEndEditing="YES" title="customer@example.com" id="emailField-cell">
                                    <font key="font" metaFont="system"/>
                                    <color key="textColor" name="labelColor" catalog="System" colorSpace="catalog"/>
                                    <color key="backgroundColor" name="textBackgroundColor" catalog="System" colorSpace="catalog"/>
                                </textFieldCell>
                            </textField>
                            <!-- keyboardType 4 is the number pad: digits only,
                                 matching the Android XML's digits="0123456789"
                                 and the web page's inputmode="numeric". -->
                            <textField opaque="NO" contentMode="scaleToFill" fixedFrame="YES" translatesAutoresizingMaskIntoConstraints="NO" id="phoneField" keyboardType="4">
                                <rect key="frame" x="24" y="220" width="345" height="34"/>
                                <autoresizingMask key="autoresizingMask" flexibleMaxX="YES" flexibleMaxY="YES"/>
                                <textFieldCell key="cell" scrollable="YES" lineBreakMode="clipping" sendsActionOnEndEditing="YES" title="Phone (optional — for mobile money)" id="phoneField-cell">
                                    <font key="font" metaFont="system"/>
                                    <color key="textColor" name="labelColor" catalog="System" colorSpace="catalog"/>
                                    <color key="backgroundColor" name="textBackgroundColor" catalog="System" colorSpace="catalog"/>
                                </textFieldCell>
                            </textField>
                            <button opaque="NO" contentMode="scaleToFill" fixedFrame="YES" contentHorizontalAlignment="center" contentVerticalAlignment="center" buttonType="system" lineBreakMode="middleTruncation" translatesAutoresizingMaskIntoConstraints="NO" id="buyButton">
                                <rect key="frame" x="24" y="278" width="345" height="34"/>
                                <autoresizingMask key="autoresizingMask" flexibleMaxX="YES" flexibleMaxY="YES"/>
                                <state key="normal" title="Buy now"/>
                                <connections>
                                    <action selector="createPaymentTapped:" destination="main-vc" eventType="touchUpInside" id="buyButton-action"/>
                                </connections>
                            </button>
                            <label opaque="NO" userInteractionEnabled="NO" contentMode="left" horizontalHuggingPriority="251" verticalHuggingPriority="251" fixedFrame="YES" text="" textAlignment="natural" lineBreakMode="tailTruncation" numberOfLines="0" baselineAdjustment="alignBaselines" adjustsFontSizeToFit="NO" translatesAutoresizingMaskIntoConstraints="NO" id="resultLabel">
                                <rect key="frame" x="24" y="332" width="345" height="21"/>
                                <autoresizingMask key="autoresizingMask" flexibleMaxX="YES" flexibleMaxY="YES"/>
                                <fontDescription key="fontDescription" type="system" pointSize="14"/>
                                <color key="textColor" name="labelColor" catalog="System" colorSpace="catalog"/>
                            </label>
                        </subviews>
                        <viewLayoutGuide key="safeArea" id="main-safe-area"/>
                        <color key="backgroundColor" name="systemBackgroundColor" catalog="System" colorSpace="catalog"/>
                    </view>
                    <connections>
                        <outlet property="amountField" destination="amountField" id="outlet-amount"/>
                        <outlet property="emailField" destination="emailField" id="outlet-email"/>
                        <outlet property="phoneField" destination="phoneField" id="outlet-phone"/>
                        <outlet property="buyButton" destination="buyButton" id="outlet-buy"/>
                        <outlet property="resultLabel" destination="resultLabel" id="outlet-result"/>
                    </connections>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="main-first-responder" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
            <point key="canvasLocation" x="53" y="375"/>
        </scene>
    </scenes>
</document>`;

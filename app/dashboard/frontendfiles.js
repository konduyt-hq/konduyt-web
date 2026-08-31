// The three real "frontend" file types a project might use, shown as
// pills matching the 12 backend language pills. HTML/CSS is the web
// frontend (used by the web/CLI backend languages); Android XML and iOS
// Storyboard are what Android and iOS actually use INSTEAD of HTML/CSS --
// neither platform renders a web page, so neither has an HTML/CSS
// equivalent, they have their own real UI-definition file format.
//
// Every id defined here is a real id the corresponding backend language
// tab reads by name -- amountInput/emailInput/buyButton/resultText on
// Android, amountField/emailField/buyButton/resultLabel (+ the
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
     The real Android UI-definition file -- what MainActivity's
     setContentView(R.layout.activity_main) actually loads. This is
     Android's equivalent of HTML/CSS: a real, separate file describing
     the screen, not something written inline in the Activity code.
     Every id below (amountInput, emailInput, buyButton, resultText) is
     read by name in the Java/Kotlin backend tabs via findViewById. -->
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
     iOS's classic UIKit equivalent of HTML/CSS -- a real, separate XML
     file describing the screen, used instead of (or alongside) SwiftUI.
     Every id/selector below (amountField, emailField, buyButton, the
     createPaymentTapped: action, resultLabel) is read by name in the
     Swift backend tab via @IBOutlet / @IBAction. -->
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0">
    <scenes>
        <scene>
            <objects>
                <viewController id="main-vc" customClass="ViewController">
                    <view key="view" contentMode="scaleToFill">
                        <subviews>
                            <textField placeholder="Amount (e.g. a donation, or leave for the fixed price)"
                                keyboardType="numberPad" id="amountField"/>
                            <textField placeholder="customer@example.com"
                                keyboardType="emailAddress" id="emailField"/>
                            <button opaque="NO" contentMode="scaleToFill" id="buyButton">
                                <state key="normal" title="Buy now"/>
                                <connections>
                                    <action selector="createPaymentTapped:" destination="main-vc" eventType="touchUpInside" id="buy-action"/>
                                </connections>
                            </button>
                            <label text="" id="resultLabel"/>
                        </subviews>
                    </view>
                </viewController>
            </objects>
        </scene>
    </scenes>
</document>`;

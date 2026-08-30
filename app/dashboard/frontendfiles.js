// The three real "frontend" file types a project might use, shown as
// pills matching the 12 backend language pills. HTML/CSS is the web
// frontend (used by the web/CLI backend languages); Android XML and iOS
// Storyboard are what Android and iOS actually use INSTEAD of HTML/CSS --
// neither platform renders a web page, so neither has an HTML/CSS
// equivalent, they have their own real UI-definition file format.
//
// The Android XML here is the real activity_main.xml the Java/Kotlin
// backend tabs' own code already references (setContentView(R.layout.
// activity_main)) but never showed the actual content of, until now.
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
     the screen, not something written inline in the Activity code. -->
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:padding="24dp">

    <TextView
        android:id="@+id/resultText"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginBottom="16dp"
        android:textSize="14sp" />

    <Button
        android:id="@+id/buyButton"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Buy now" />

</LinearLayout>`;

export const IOS_STORYBOARD_XML = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Main.storyboard
     iOS's classic UIKit equivalent of HTML/CSS -- a real, separate XML
     file describing the screen, used instead of (or alongside) SwiftUI.
     The ContentView.swift tab shows the newer SwiftUI approach, where UI
     and logic live in one file; this is the older, XML-based one, closer
     in spirit to Android's layout XML. Either is a real, valid choice --
     use whichever your project already uses. -->
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0">
    <scenes>
        <scene>
            <objects>
                <viewController id="main-vc" customClass="ViewController">
                    <view key="view" contentMode="scaleToFill">
                        <subviews>
                            <label text="" id="resultLabel"/>
                            <button opaque="NO" contentMode="scaleToFill" id="buyButton">
                                <state key="normal" title="Buy now"/>
                                <connections>
                                    <action selector="createPaymentTapped:" destination="main-vc" eventType="touchUpInside" id="buy-action"/>
                                </connections>
                            </button>
                        </subviews>
                    </view>
                </viewController>
            </objects>
        </scene>
    </scenes>
</document>`;

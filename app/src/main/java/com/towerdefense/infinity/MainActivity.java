package com.towerdefense.infinity;

import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;

import androidx.appcompat.app.AppCompatActivity;
import com.github.javiersantos.appupdater.AppUpdater;
import com.github.javiersantos.appupdater.enums.Display;
import com.github.javiersantos.appupdater.enums.UpdateFrom;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // ตั้งค่าให้เต็มจอแบบถาวร
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        );

        webView = findViewById(R.id.gameWebView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true); // อนุญาตให้รัน JS
        settings.setDomStorageEnabled(true); // สำคัญสำหรับการ Save เกม (localStorage)
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);

        // ตรวจสอบอินเทอร์เน็ตและตั้งค่าการโหลดแคชเพื่อเล่นออฟไลน์
        ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo netInfo = cm.getActiveNetworkInfo();
        if (netInfo != null && netInfo.isConnectedOrConnecting()) {
            settings.setCacheMode(WebSettings.LOAD_DEFAULT); // โหลดจากเว็บตามปกติถ้ามีเน็ต
        } else {
            settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK); // โหลดจากแคชเครื่องถ้าไม่มีเน็ต
        }

        // ตรวจสอบการอัปเดตแอปพลิเคชัน (APK) อัตโนมัติจาก GitHub Releases
        new AppUpdater(this)
            .setUpdateFrom(UpdateFrom.GITHUB)
            .setGitHubUserAndRepo("localpong", "tower-defense-infinity")
            .setDisplay(Display.DIALOG)
            .setButtonUpdate("อัปเดตเลย")
            .setButtonDismiss("ไว้ทีหลัง")
            .setButtonDoNotShowAgain("ไม่ต้องเตือนอีก")
            .setTitleOnUpdateAvailable("มีแอปเวอร์ชันใหม่!")
            .setContentOnUpdateAvailable("กรุณาอัปเดตแอปพลิเคชันเพื่อการใช้งานที่ดียิ่งขึ้น")
            .start();

        // ทำให้โหลดหน้าเว็บได้ลื่นไหล
        webView.setWebViewClient(new WebViewClient());

        // ใส่ URL GitHub Pages ของคุณที่นี่
        // เมื่อคุณอัปเดตไฟล์บนเว็บ แอปในเครื่องผู้เล่นจะอัปเดตตามทันที (Upgrad ได้)
        webView.loadUrl("https://localpong.github.io/tower-defense-infinity/");
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
            webView.pauseTimers();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
        }
    }

    @Override
    public void onBackPressed() {
        // เรียกใช้ฟังก์ชัน JavaScript goBackInApp() เพื่อจัดการการนำทางย้อนกลับภายในเว็บแอป
        webView.evaluateJavascript("javascript:goBackInApp();", value -> {
            // 'value' จะเป็น "true" หรือ "false" (ในรูปแบบ String) จาก JavaScript
            if (value != null && value.equals("true")) {
                // JavaScript จัดการการนำทางย้อนกลับแล้ว
                // ไม่ต้องทำอะไรเพิ่มเติมใน Java
            } else if (webView.canGoBack()) {
                // ถ้า WebView มีประวัติการนำทางของตัวเอง ให้ย้อนกลับใน WebView
                webView.goBack();
            } else {
                // ไม่มีประวัติการนำทางใน WebView หรือ JavaScript แล้ว ให้ออกจากแอป
                super.onBackPressed();
            }
        });
    }

    // คลาส JavaScript Interface (สามารถเพิ่มเมธอดอื่นๆ ที่ JavaScript ต้องการเรียกใช้ได้)
    public class WebViewJavaScriptInterface {
        MainActivity activity;

        WebViewJavaScriptInterface(MainActivity activity) {
            this.activity = activity;
        }

        // ตัวอย่างเมธอดที่ JavaScript สามารถเรียกใช้ได้
        @JavascriptInterface
        public void showAndroidToast(String message) {
            Toast.makeText(activity, message, Toast.LENGTH_SHORT).show();
        }
    }
}
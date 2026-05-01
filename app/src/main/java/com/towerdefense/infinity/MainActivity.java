package com.towerdefense.infinity;

import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

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

        // ทำให้โหลดหน้าเว็บได้ลื่นไหล
        webView.setWebViewClient(new WebViewClient());

        // ระบบเช็คอัปเดตอัตโนมัติจาก GitHub Releases
        AppUpdater appUpdater = new AppUpdater(this)
            .setUpdateFrom(UpdateFrom.GITHUB)
            .setGitHubUserAndRepo("localpong", "tower-defense-infinity")
            .setDisplay(Display.DIALOG)
            .setButtonUpdate("อัปเดตเลย")
            .setButtonDismiss("ไว้ทีหลัง")
            .setButtonDoNotShowAgain("ไม่ต้องเตือนอีก")
            .setTitleOnUpdateAvailable("มีเวอร์ชันใหม่!")
            .setContentOnUpdateAvailable("กรุณาอัปเดตแอปเป็นเวอร์ชันล่าสุดเพื่อการใช้งานที่ดียิ่งขึ้น");
        appUpdater.start();

        // ใส่ URL GitHub Pages ของคุณที่นี่
        // เมื่อคุณอัปเดตไฟล์บนเว็บ แอปในเครื่องผู้เล่นจะอัปเดตตามทันที (Upgrad ได้)
        webView.loadUrl("https://localpong.github.io/tower-defense-infinity/");
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
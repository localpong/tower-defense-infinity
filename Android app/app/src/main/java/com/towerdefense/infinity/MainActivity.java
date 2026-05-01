package com.towerdefense.infinity;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

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

        // ใส่ URL GitHub Pages ของคุณที่นี่
        // เมื่อคุณอัปเดตไฟล์บนเว็บ แอปในเครื่องผู้เล่นจะอัปเดตตามทันที (Upgrad ได้)
        webView.loadUrl("https://localpong.github.io/tower-defense-infinity/");
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
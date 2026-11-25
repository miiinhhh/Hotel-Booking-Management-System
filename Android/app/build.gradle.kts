import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
}

/**
 * Địa chỉ Backend mà app gọi tới, theo thứ tự ưu tiên:
 *  1. Tham số build:  ./gradlew assembleRelease -PapiBaseUrl=http://192.168.1.10:5131/
 *  2. Dòng `apiBaseUrl=...` trong local.properties (riêng từng máy, không đưa lên repo)
 *  3. Mặc định http://10.0.2.2:5131/ = localhost của máy tính khi chạy trên Android Emulator.
 */
val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
val apiBaseUrl: String = ((project.findProperty("apiBaseUrl") as String?)
    ?: localProps.getProperty("apiBaseUrl")
    ?: "http://10.0.2.2:5131/").let { if (it.endsWith("/")) it else "$it/" }

android {
    namespace = "com.example.hotelbookingandroid"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "com.example.hotelbookingandroid"
        minSdk = 24
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        debug {
            buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
        }
        release {
            buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
            // Bản demo/nộp bài: ký bằng khóa debug để cài trực tiếp được (không phát hành lên Google Play).
            signingConfig = signingConfigs.getByName("debug")
            optimization {
                enable = false
            }
        }
    }
    buildFeatures {
        buildConfig = true
        viewBinding = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation(libs.activity.ktx)
    implementation(libs.appcompat)
    implementation(libs.constraintlayout)
    implementation(libs.material)
    implementation(libs.fragment)
    implementation(libs.lifecycle.viewmodel)
    implementation(libs.lifecycle.livedata)
    implementation(libs.recyclerview)
    implementation(libs.swiperefreshlayout)
    implementation(libs.retrofit)
    implementation(libs.retrofit.gson)
    implementation(libs.okhttp.logging)
    implementation(libs.gson)
    implementation(libs.glide)
    testImplementation(libs.junit)
    androidTestImplementation(libs.espresso.core)
    androidTestImplementation(libs.ext.junit)
}

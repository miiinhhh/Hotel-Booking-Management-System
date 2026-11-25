package com.example.hotelbookingandroid.ui.portal.admin;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.View;

import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

import com.example.hotelbookingandroid.R;

import java.util.ArrayList;
import java.util.List;

/**
 * Biểu đồ cột đơn giản (một chuỗi dữ liệu) cho doanh thu theo ngày.
 * Cột bo góc trên, đường lưới mảnh, nhãn trục X thưa dần khi nhiều cột; không cần thư viện ngoài.
 */
public class BarChartView extends View {
    private final Paint barPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint gridPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint labelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF rect = new RectF();
    private final List<Double> values = new ArrayList<>();
    private final List<String> labels = new ArrayList<>();
    private final float density;

    public BarChartView(Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        density = getResources().getDisplayMetrics().density;
        barPaint.setColor(ContextCompat.getColor(context, R.color.md_primary_container));
        gridPaint.setColor(ContextCompat.getColor(context, R.color.md_surface_container_high));
        gridPaint.setStrokeWidth(density);
        labelPaint.setColor(ContextCompat.getColor(context, R.color.md_on_surface_variant));
        labelPaint.setTextSize(10 * getResources().getDisplayMetrics().scaledDensity);
        labelPaint.setTextAlign(Paint.Align.CENTER);
    }

    public void setData(List<Double> newValues, List<String> newLabels) {
        values.clear();
        labels.clear();
        values.addAll(newValues);
        labels.addAll(newLabels);
        invalidate();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        if (values.isEmpty()) return;
        float labelArea = 18 * density;
        float w = getWidth() - getPaddingLeft() - getPaddingRight();
        float h = getHeight() - getPaddingTop() - getPaddingBottom() - labelArea;
        float left = getPaddingLeft();
        float top = getPaddingTop();

        // 3 đường lưới ngang
        for (int i = 0; i <= 2; i++) {
            float y = top + h * i / 2f;
            canvas.drawLine(left, y, left + w, y, gridPaint);
        }

        double max = 0;
        for (double v : values) max = Math.max(max, v);
        if (max <= 0) max = 1;

        int n = values.size();
        float slot = w / n;
        float barWidth = Math.max(2 * density, Math.min(slot * 0.6f, 24 * density));
        float radius = Math.min(barWidth / 2f, 4 * density);
        int labelEvery = Math.max(1, (int) Math.ceil(n / 7.0)); // tối đa ~7 nhãn

        for (int i = 0; i < n; i++) {
            float cx = left + slot * i + slot / 2f;
            float barH = (float) (values.get(i) / max) * h;
            if (values.get(i) > 0) barH = Math.max(barH, 2 * density);
            rect.set(cx - barWidth / 2f, top + h - barH, cx + barWidth / 2f, top + h);
            canvas.drawRoundRect(rect, radius, radius, barPaint);
            if (i < labels.size() && i % labelEvery == 0) {
                canvas.drawText(labels.get(i), cx, top + h + labelArea - 4 * density, labelPaint);
            }
        }
    }
}

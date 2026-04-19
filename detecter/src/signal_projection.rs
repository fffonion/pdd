pub(crate) fn build_luma(rgba: &[u8], width: usize, height: usize) -> Vec<f32> {
    let mut output = vec![0.0; width * height];
    for (index, value) in output.iter_mut().enumerate().take(width * height) {
        let base = index * 4;
        let r = rgba[base] as f32;
        let g = rgba[base + 1] as f32;
        let b = rgba[base + 2] as f32;
        *value = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    output
}

pub(crate) fn build_column_edge_projection(luma: &[f32], width: usize, height: usize) -> Vec<f32> {
    let mut projection = vec![0.0; width];
    for y in 1..height.saturating_sub(1) {
        let row = y * width;
        for x in 1..width.saturating_sub(1) {
            let gx = (luma[row + x + 1] - luma[row + x - 1]).abs();
            let gy = (luma[row + x + width] - luma[row + x - width]).abs();
            projection[x] += gx + gy * 0.15;
        }
    }
    projection
}

pub(crate) fn build_row_edge_projection(luma: &[f32], width: usize, height: usize) -> Vec<f32> {
    let mut projection = vec![0.0; height];
    for (y, value) in projection
        .iter_mut()
        .enumerate()
        .take(height.saturating_sub(1))
        .skip(1)
    {
        let row = y * width;
        for x in 1..width.saturating_sub(1) {
            let gx = (luma[row + x + 1] - luma[row + x - 1]).abs();
            let gy = (luma[row + x + width] - luma[row + x - width]).abs();
            *value += gy + gx * 0.15;
        }
    }
    projection
}

pub(crate) fn smooth_projection(values: &mut [f32], radius: usize) {
    if values.len() < 3 || radius == 0 {
        return;
    }

    let source = values.to_vec();
    for index in 0..values.len() {
        let start = index.saturating_sub(radius);
        let end = (index + radius + 1).min(values.len());
        let mut sum = 0.0;
        for value in &source[start..end] {
            sum += *value;
        }
        values[index] = sum / (end - start) as f32;
    }
}

pub(crate) fn normalize_projection(values: &mut [f32], divisor: f32) {
    if divisor <= 0.0 {
        return;
    }
    for value in values {
        *value /= divisor;
    }
}

pub(crate) fn build_crop_column_projection(
    luma: &[f32],
    width: usize,
    left: usize,
    right: usize,
    top: usize,
    bottom: usize,
) -> Vec<f32> {
    let safe_left = left.saturating_add(1);
    let safe_right = right.saturating_sub(1);
    let safe_top = top.saturating_add(1);
    let safe_bottom = bottom.saturating_sub(1);
    let mut projection = vec![0.0; safe_right.saturating_sub(safe_left).max(1)];

    for y in safe_top..safe_bottom {
        let row = y * width;
        for x in safe_left..safe_right {
            projection[x - safe_left] += (luma[row + x + 1] - luma[row + x - 1]).abs();
        }
    }

    smooth_projection(&mut projection, 3);
    projection
}

pub(crate) fn build_crop_row_projection(
    luma: &[f32],
    width: usize,
    left: usize,
    right: usize,
    top: usize,
    bottom: usize,
) -> Vec<f32> {
    let safe_left = left.saturating_add(1);
    let safe_right = right.saturating_sub(1);
    let safe_top = top.saturating_add(1);
    let safe_bottom = bottom.saturating_sub(1);
    let mut projection = vec![0.0; safe_bottom.saturating_sub(safe_top).max(1)];

    for y in safe_top..safe_bottom {
        let row = y * width;
        for x in safe_left..safe_right {
            projection[y - safe_top] += (luma[row + x + width] - luma[row + x - width]).abs();
        }
    }

    smooth_projection(&mut projection, 3);
    projection
}

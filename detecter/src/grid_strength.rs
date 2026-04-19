use crate::types::RectBox;

pub(crate) fn estimate_axis_boundary_strength_in_rect(
    luma: &[f32],
    width: usize,
    rect: RectBox,
    origin: usize,
    cell_size: f32,
    steps: usize,
    vertical_lines: bool,
) -> f32 {
    if steps <= 1 || cell_size <= 1.0 {
        return 0.0;
    }

    let mut boundary_total = 0.0_f32;
    let mut boundary_count = 0_usize;
    let mut interior_total = 0.0_f32;
    let mut interior_count = 0_usize;

    for index in 1..steps {
        let boundary = origin as f32 + index as f32 * cell_size;
        let interior = origin as f32 + (index as f32 - 0.5) * cell_size;

        boundary_total += sample_axis_gradient_in_rect(luma, width, rect, boundary, vertical_lines);
        interior_total += sample_axis_gradient_in_rect(luma, width, rect, interior, vertical_lines);
        boundary_count += 1;
        interior_count += 1;
    }

    let boundary_mean = boundary_total / boundary_count.max(1) as f32;
    let interior_mean = interior_total / interior_count.max(1) as f32;
    boundary_mean / interior_mean.max(1e-3)
}

fn sample_axis_gradient_in_rect(
    luma: &[f32],
    width: usize,
    rect: RectBox,
    position: f32,
    vertical_lines: bool,
) -> f32 {
    if vertical_lines {
        if rect.right <= rect.left + 2 {
            return 0.0;
        }

        let x = position.round() as usize;
        let clamped_x = x.clamp(rect.left + 1, rect.right.saturating_sub(2));
        let mut total = 0.0_f32;
        let mut count = 0_usize;
        for y in rect.top.saturating_add(1)..rect.bottom.saturating_sub(1) {
            let row = y * width;
            total += (luma[row + clamped_x + 1] - luma[row + clamped_x - 1]).abs();
            count += 1;
        }
        return total / count.max(1) as f32;
    }

    if rect.bottom <= rect.top + 2 {
        return 0.0;
    }

    let y = position.round() as usize;
    let clamped_y = y.clamp(rect.top + 1, rect.bottom.saturating_sub(2));
    let mut total = 0.0_f32;
    let mut count = 0_usize;
    let row = clamped_y * width;
    for x in rect.left.saturating_add(1)..rect.right.saturating_sub(1) {
        total += (luma[row + x + width] - luma[row + x - width]).abs();
        count += 1;
    }
    total / count.max(1) as f32
}

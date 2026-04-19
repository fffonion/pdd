use crate::{detector_signal::build_luma, fft::dominant_frequency_ratio};

const CELL_STRIDE: usize = 6;

pub(crate) fn compute_detail_signal(
    rgba: &[u8],
    width: usize,
    height: usize,
    grid_width: usize,
    grid_height: usize,
) -> Vec<i32> {
    if width == 0 || height == 0 || grid_width == 0 || grid_height == 0 {
        return Vec::new();
    }

    let x_edges = build_edges(width, grid_width);
    let y_edges = build_edges(height, grid_height);
    let luma = build_luma(rgba, width, height);
    let blurred_luma = box_blur_luma(&luma, width, height);
    let detail_luma = luma
        .iter()
        .zip(blurred_luma.iter())
        .map(|(base, blur)| base - blur)
        .collect::<Vec<_>>();
    let mut output = vec![0_i32; 1 + grid_width * grid_height * CELL_STRIDE];
    output[0] = (grid_width * grid_height) as i32;

    for row in 0..grid_height {
        let top = y_edges[row];
        let bottom = y_edges[row + 1].max(top + 1).min(height);
        for column in 0..grid_width {
            let left = x_edges[column];
            let right = x_edges[column + 1].max(left + 1).min(width);
            let signal = analyze_patch(rgba, &luma, &detail_luma, width, left, top, right, bottom);
            let offset = 1 + (row * grid_width + column) * CELL_STRIDE;
            output[offset] = i32::from(signal.protected);
            output[offset + 1] = (signal.energy * 1000.0).round() as i32;
            output[offset + 2] = (signal.contrast * 1000.0).round() as i32;
            output[offset + 3] = signal.rgb[0] as i32;
            output[offset + 4] = signal.rgb[1] as i32;
            output[offset + 5] = signal.rgb[2] as i32;
        }
    }

    output
}

struct PatchSignal {
    protected: bool,
    energy: f32,
    contrast: f32,
    rgb: [u8; 3],
}

fn analyze_patch(
    rgba: &[u8],
    luma: &[f32],
    detail_luma: &[f32],
    width: usize,
    left: usize,
    top: usize,
    right: usize,
    bottom: usize,
) -> PatchSignal {
    let patch_width = right.saturating_sub(left).max(1);
    let patch_height = bottom.saturating_sub(top).max(1);
    let patch_area = patch_width * patch_height;
    let mut visible = 0_usize;
    let mut luma_sum = 0.0_f32;
    let mut darkest_luma = 255.0_f32;

    for y in top..bottom {
        for x in left..right {
            let pixel_index = (y * width + x) * 4;
            let alpha = rgba[pixel_index + 3];
            if alpha < 16 {
                continue;
            }
            let index = y * width + x;
            visible += 1;
            luma_sum += luma[index];
            darkest_luma = darkest_luma.min(luma[index]);
        }
    }

    if visible < 4 || patch_area < 16 {
        return PatchSignal {
            protected: false,
            energy: 0.0,
            contrast: 0.0,
            rgb: [0, 0, 0],
        };
    }

    let mean_luma = luma_sum / visible as f32;
    let mut candidate_mask = vec![0_u8; patch_area];
    let mut candidate_count = 0_usize;
    let mut support_count = 0_usize;
    let mut energy_sum = 0.0_f32;
    let mut contrast_sum = 0.0_f32;
    let mut rgb_sum = [0.0_f32; 3];
    let mut x_projection = vec![0.0_f32; patch_width];
    let mut y_projection = vec![0.0_f32; patch_height];
    let mut desc_projection = vec![0.0_f32; patch_width + patch_height - 1];
    let mut asc_projection = vec![0.0_f32; patch_width + patch_height - 1];

    for local_y in 0..patch_height {
        for local_x in 0..patch_width {
            let x = left + local_x;
            let y = top + local_y;
            let pixel_index = (y * width + x) * 4;
            let alpha = rgba[pixel_index + 3];
            if alpha < 16 {
                continue;
            }

            let index = y * width + x;
            let local_index = local_y * patch_width + local_x;
            let local_contrast = mean_luma - luma[index];
            let local_energy = (-detail_luma[index]).max(0.0);
            let is_candidate =
                local_contrast >= 16.0 && (local_energy >= 3.5 || luma[index] <= mean_luma - 24.0);
            if !is_candidate {
                continue;
            }

            candidate_mask[local_index] = 1;
            candidate_count += 1;
            energy_sum += local_energy;
            contrast_sum += local_contrast;
            rgb_sum[0] += rgba[pixel_index] as f32;
            rgb_sum[1] += rgba[pixel_index + 1] as f32;
            rgb_sum[2] += rgba[pixel_index + 2] as f32;
            let weight = local_contrast + local_energy * 1.5;
            x_projection[local_x] += weight;
            y_projection[local_y] += weight;
            desc_projection[local_x + local_y] += weight;
            asc_projection[local_x + (patch_height - 1 - local_y)] += weight;
        }
    }

    if candidate_count == 0 {
        return PatchSignal {
            protected: false,
            energy: 0.0,
            contrast: 0.0,
            rgb: [0, 0, 0],
        };
    }

    for local_y in 0..patch_height {
        for local_x in 0..patch_width {
            let local_index = local_y * patch_width + local_x;
            if candidate_mask[local_index] == 0 {
                continue;
            }

            let has_neighbor = (-1_isize..=1).any(|dy| {
                (-1_isize..=1).any(|dx| {
                    if dx == 0 && dy == 0 {
                        return false;
                    }
                    let next_x = local_x as isize + dx;
                    let next_y = local_y as isize + dy;
                    if next_x < 0
                        || next_y < 0
                        || next_x >= patch_width as isize
                        || next_y >= patch_height as isize
                    {
                        return false;
                    }
                    candidate_mask[next_y as usize * patch_width + next_x as usize] != 0
                })
            });

            if has_neighbor {
                support_count += 1;
            }
        }
    }

    let candidate_ratio = candidate_count as f32 / visible.max(1) as f32;
    let support_ratio = support_count as f32 / candidate_count.max(1) as f32;
    let largest_component_ratio =
        largest_component_ratio(&candidate_mask, patch_width, patch_height);
    let mean_energy = energy_sum / candidate_count as f32;
    let mean_contrast = contrast_sum / candidate_count as f32;
    let min_patch_side = patch_width.min(patch_height) as f32;
    let axis_coherence = [
        dominant_frequency_ratio(&x_projection),
        dominant_frequency_ratio(&y_projection),
    ]
    .into_iter()
    .flatten()
    .fold(0.0_f32, f32::max);
    let diag_coherence = [
        dominant_frequency_ratio(&desc_projection),
        dominant_frequency_ratio(&asc_projection),
    ]
    .into_iter()
    .flatten()
    .fold(0.0_f32, f32::max);
    let fft_coherence = axis_coherence.max(diag_coherence);
    let fft_verified = diag_coherence >= 0.2 && diag_coherence >= axis_coherence * 0.9;
    let protected = min_patch_side >= 4.0
        && candidate_count >= 2
        && candidate_ratio >= 0.01
        && candidate_ratio <= 0.18
        && support_ratio >= 0.55
        && largest_component_ratio >= 0.55
        && mean_contrast >= 22.0
        && fft_coherence >= 0.2
        && fft_verified
        && (mean_energy >= 4.0 || darkest_luma <= mean_luma - 30.0);

    PatchSignal {
        protected,
        energy: mean_energy / 255.0,
        contrast: mean_contrast / 255.0,
        rgb: [
            (rgb_sum[0] / candidate_count as f32)
                .round()
                .clamp(0.0, 255.0) as u8,
            (rgb_sum[1] / candidate_count as f32)
                .round()
                .clamp(0.0, 255.0) as u8,
            (rgb_sum[2] / candidate_count as f32)
                .round()
                .clamp(0.0, 255.0) as u8,
        ],
    }
}

fn largest_component_ratio(mask: &[u8], width: usize, height: usize) -> f32 {
    if mask.is_empty() {
        return 0.0;
    }

    let total = mask.iter().filter(|value| **value != 0).count();
    if total == 0 {
        return 0.0;
    }

    let mut visited = vec![0_u8; mask.len()];
    let mut best = 0_usize;
    let mut stack = Vec::<usize>::new();

    for index in 0..mask.len() {
        if mask[index] == 0 || visited[index] != 0 {
            continue;
        }

        visited[index] = 1;
        stack.push(index);
        let mut size = 0_usize;
        while let Some(current) = stack.pop() {
            size += 1;
            let x = current % width;
            let y = current / width;
            for dy in -1_isize..=1 {
                for dx in -1_isize..=1 {
                    if dx == 0 && dy == 0 {
                        continue;
                    }
                    let next_x = x as isize + dx;
                    let next_y = y as isize + dy;
                    if next_x < 0
                        || next_y < 0
                        || next_x >= width as isize
                        || next_y >= height as isize
                    {
                        continue;
                    }
                    let next = next_y as usize * width + next_x as usize;
                    if mask[next] == 0 || visited[next] != 0 {
                        continue;
                    }
                    visited[next] = 1;
                    stack.push(next);
                }
            }
        }

        if size > best {
            best = size;
        }
    }

    best as f32 / total as f32
}

fn build_edges(total: usize, segments: usize) -> Vec<usize> {
    (0..=segments)
        .map(|index| ((index as f32 / segments as f32) * total as f32).round() as usize)
        .collect()
}

fn box_blur_luma(luma: &[f32], width: usize, height: usize) -> Vec<f32> {
    let mut output = vec![0.0_f32; luma.len()];
    for y in 0..height {
        for x in 0..width {
            let mut sum = 0.0_f32;
            let mut count = 0.0_f32;
            for sample_y in y.saturating_sub(1)..=(y + 1).min(height.saturating_sub(1)) {
                for sample_x in x.saturating_sub(1)..=(x + 1).min(width.saturating_sub(1)) {
                    sum += luma[sample_y * width + sample_x];
                    count += 1.0;
                }
            }
            output[y * width + x] = sum / count.max(1.0);
        }
    }
    output
}

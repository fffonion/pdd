mod detail_signal;
mod detector;
mod detector_common;
mod detector_signal;
mod edge_enhance;
mod fft;
mod grid_strength;
mod signal_projection;
mod types;
mod wasm_input;
mod wasm_result;

use detail_signal::compute_detail_signal;
use detector::{detect_auto_inner, detect_chart_inner, detect_pixel_art_inner};
use edge_enhance::enhance_edges_fft_in_place;
use wasm_input::{read_rgba_input, read_rgba_input_mut};
use wasm_result::{
    clear_detail_result, detail_buffer_len, detail_buffer_ptr, result_buffer_ptr,
    store_detail_result, write_auto_result, write_single_result,
};

#[unsafe(no_mangle)]
pub extern "C" fn alloc(size: usize) -> *mut u8 {
    let mut buffer = Vec::<u8>::with_capacity(size);
    let pointer = buffer.as_mut_ptr();
    std::mem::forget(buffer);
    pointer
}

#[unsafe(no_mangle)]
/// # Safety
///
/// `ptr` must have been returned by [`alloc`] from this module, and `capacity`
/// must match the allocation capacity originally requested for that pointer.
pub unsafe extern "C" fn dealloc(ptr: *mut u8, capacity: usize) {
    if ptr.is_null() || capacity == 0 {
        return;
    }
    unsafe { drop(Vec::from_raw_parts(ptr, 0, capacity)) };
}

#[unsafe(no_mangle)]
pub extern "C" fn result_ptr() -> *const i32 {
    result_buffer_ptr()
}

#[unsafe(no_mangle)]
pub extern "C" fn detail_result_ptr() -> *const i32 {
    detail_buffer_ptr()
}

#[unsafe(no_mangle)]
pub extern "C" fn detail_result_len() -> usize {
    detail_buffer_len()
}

#[unsafe(no_mangle)]
pub extern "C" fn detect_auto(ptr: *const u8, len: usize, width: u32, height: u32) -> u32 {
    let Some((rgba, width, height)) = read_rgba_input(ptr, len, width, height, 48) else {
        write_auto_result(None, None);
        return 0;
    };
    let (chart, pixel) = detect_auto_inner(rgba, width, height);
    write_auto_result(chart, pixel);
    if chart.is_some() || pixel.is_some() {
        1
    } else {
        0
    }
}

#[unsafe(no_mangle)]
pub extern "C" fn detect_chart(ptr: *const u8, len: usize, width: u32, height: u32) -> u32 {
    let Some((rgba, width, height)) = read_rgba_input(ptr, len, width, height, 96) else {
        write_single_result(None);
        return 0;
    };
    let detection = detect_chart_inner(rgba, width, height);
    write_single_result(detection);
    u32::from(detection.is_some())
}

#[unsafe(no_mangle)]
pub extern "C" fn detect_pixel_art(ptr: *const u8, len: usize, width: u32, height: u32) -> u32 {
    let Some((rgba, width, height)) = read_rgba_input(ptr, len, width, height, 48) else {
        write_single_result(None);
        return 0;
    };
    let detection = detect_pixel_art_inner(rgba, width, height);
    write_single_result(detection);
    u32::from(detection.is_some())
}

#[unsafe(no_mangle)]
pub extern "C" fn enhance_edges(
    ptr: *mut u8,
    len: usize,
    width: u32,
    height: u32,
    strength_milli: u32,
) -> u32 {
    let Some((rgba, width, height)) = read_rgba_input_mut(ptr, len, width, height, 3) else {
        return 0;
    };
    if strength_milli == 0 {
        return 0;
    }
    u32::from(enhance_edges_fft_in_place(
        rgba,
        width,
        height,
        strength_milli as f32 / 1000.0,
    ))
}

#[unsafe(no_mangle)]
pub extern "C" fn detail_signal(
    ptr: *const u8,
    len: usize,
    width: u32,
    height: u32,
    grid_width: u32,
    grid_height: u32,
) -> u32 {
    let grid_width = grid_width as usize;
    let grid_height = grid_height as usize;
    if grid_width == 0 || grid_height == 0 {
        clear_detail_result();
        return 0;
    }

    let Some((rgba, width, height)) = read_rgba_input(ptr, len, width, height, 1) else {
        clear_detail_result();
        return 0;
    };

    let result = compute_detail_signal(rgba, width, height, grid_width, grid_height);
    let has_result = !result.is_empty();
    store_detail_result(result);
    u32::from(has_result)
}

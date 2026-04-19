use crate::types::Detection;

const AUTO_RESULT_SLOTS: usize = 16;
const DETECTION_SLOT_LEN: usize = 8;

static mut RESULT: [i32; AUTO_RESULT_SLOTS] = [0; AUTO_RESULT_SLOTS];
static mut DETAIL_RESULT_PTR: *mut i32 = std::ptr::null_mut();
static mut DETAIL_RESULT_LEN: usize = 0;
static mut DETAIL_RESULT_CAP: usize = 0;

pub(crate) fn result_buffer_ptr() -> *const i32 {
    (&raw const RESULT).cast::<i32>()
}

pub(crate) fn detail_buffer_ptr() -> *const i32 {
    unsafe { DETAIL_RESULT_PTR as *const i32 }
}

pub(crate) fn detail_buffer_len() -> usize {
    unsafe { DETAIL_RESULT_LEN }
}

pub(crate) fn write_single_result(result: Option<Detection>) {
    unsafe {
        RESULT = [0; AUTO_RESULT_SLOTS];
        write_result_at(0, result);
    }
}

pub(crate) fn write_auto_result(chart: Option<Detection>, pixel: Option<Detection>) {
    unsafe {
        RESULT = [0; AUTO_RESULT_SLOTS];
        write_result_at(0, chart);
        write_result_at(DETECTION_SLOT_LEN, pixel);
    }
}

pub(crate) fn clear_detail_result() {
    unsafe {
        if !DETAIL_RESULT_PTR.is_null() && DETAIL_RESULT_CAP > 0 {
            drop(Vec::from_raw_parts(
                DETAIL_RESULT_PTR,
                DETAIL_RESULT_LEN,
                DETAIL_RESULT_CAP,
            ));
        }
        DETAIL_RESULT_PTR = std::ptr::null_mut();
        DETAIL_RESULT_LEN = 0;
        DETAIL_RESULT_CAP = 0;
    }
}

pub(crate) fn store_detail_result(mut result: Vec<i32>) {
    clear_detail_result();
    unsafe {
        DETAIL_RESULT_PTR = result.as_mut_ptr();
        DETAIL_RESULT_LEN = result.len();
        DETAIL_RESULT_CAP = result.capacity();
    }
    std::mem::forget(result);
}

fn write_result_at(offset: usize, result: Option<Detection>) {
    unsafe {
        if let Some(detection) = result {
            let encoded = encode_detection(detection);
            RESULT[offset..offset + encoded.len()].copy_from_slice(&encoded);
        }
    }
}

fn encode_detection(detection: Detection) -> [i32; DETECTION_SLOT_LEN] {
    [
        1,
        detection.left as i32,
        detection.top as i32,
        detection.right as i32,
        detection.bottom as i32,
        detection.grid_width as i32,
        detection.grid_height as i32,
        (detection.confidence * 1000.0).round() as i32,
    ]
}

#[cfg(test)]
mod tests {
    use super::{
        clear_detail_result, detail_buffer_len, detail_buffer_ptr, encode_detection,
        result_buffer_ptr, store_detail_result, write_auto_result,
    };
    use crate::types::Detection;
    use std::sync::{Mutex, OnceLock};

    fn state_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    #[test]
    fn encode_detection_preserves_current_wasm_layout() {
        let encoded = encode_detection(Detection {
            left: 10,
            top: 11,
            right: 110,
            bottom: 151,
            grid_width: 20,
            grid_height: 28,
            confidence: 0.876,
        });

        assert_eq!(encoded, [1, 10, 11, 110, 151, 20, 28, 876]);
    }

    #[test]
    fn write_auto_result_keeps_chart_and_pixel_slots_separate() {
        let _guard = state_lock().lock().expect("lock test state");
        let chart = Some(Detection {
            left: 1,
            top: 2,
            right: 31,
            bottom: 42,
            grid_width: 10,
            grid_height: 12,
            confidence: 0.91,
        });
        let pixel = Some(Detection {
            left: 3,
            top: 4,
            right: 53,
            bottom: 64,
            grid_width: 16,
            grid_height: 18,
            confidence: 0.64,
        });

        write_auto_result(chart, pixel);

        let values = unsafe { std::slice::from_raw_parts(result_buffer_ptr(), 16) };
        assert_eq!(values[..8], [1, 1, 2, 31, 42, 10, 12, 910]);
        assert_eq!(values[8..], [1, 3, 4, 53, 64, 16, 18, 640]);
    }

    #[test]
    fn detail_result_storage_replaces_previous_buffer_and_can_clear() {
        let _guard = state_lock().lock().expect("lock test state");
        clear_detail_result();

        store_detail_result(vec![1, 2, 3, 4]);
        let first_ptr = detail_buffer_ptr();
        assert!(!first_ptr.is_null());
        assert_eq!(detail_buffer_len(), 4);
        let first_values = unsafe { std::slice::from_raw_parts(first_ptr, 4) };
        assert_eq!(first_values, [1, 2, 3, 4]);

        store_detail_result(vec![7, 8]);
        let second_ptr = detail_buffer_ptr();
        assert!(!second_ptr.is_null());
        assert_eq!(detail_buffer_len(), 2);
        let second_values = unsafe { std::slice::from_raw_parts(second_ptr, 2) };
        assert_eq!(second_values, [7, 8]);

        clear_detail_result();
        assert!(detail_buffer_ptr().is_null());
        assert_eq!(detail_buffer_len(), 0);
    }
}

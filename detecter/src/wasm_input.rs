use std::slice;

pub(crate) fn read_rgba_input<'a>(
    ptr: *const u8,
    len: usize,
    width: u32,
    height: u32,
    min_side: usize,
) -> Option<(&'a [u8], usize, usize)> {
    let width = width as usize;
    let height = height as usize;
    let expected_len = width.saturating_mul(height).saturating_mul(4);
    if ptr.is_null() || len < expected_len || width < min_side || height < min_side {
        return None;
    }

    let rgba = unsafe { slice::from_raw_parts(ptr, expected_len) };
    Some((rgba, width, height))
}

pub(crate) fn read_rgba_input_mut<'a>(
    ptr: *mut u8,
    len: usize,
    width: u32,
    height: u32,
    min_side: usize,
) -> Option<(&'a mut [u8], usize, usize)> {
    let width = width as usize;
    let height = height as usize;
    let expected_len = width.saturating_mul(height).saturating_mul(4);
    if ptr.is_null() || len < expected_len || width < min_side || height < min_side {
        return None;
    }

    let rgba = unsafe { slice::from_raw_parts_mut(ptr, expected_len) };
    Some((rgba, width, height))
}

#[cfg(test)]
mod tests {
    use super::read_rgba_input;

    #[test]
    fn read_rgba_input_rejects_short_or_too_small_images() {
        let rgba = vec![255_u8; 4 * 4 * 4];

        assert!(read_rgba_input(rgba.as_ptr(), rgba.len() - 1, 4, 4, 1).is_none());
        assert!(read_rgba_input(rgba.as_ptr(), rgba.len(), 4, 4, 8).is_none());

        let valid =
            read_rgba_input(rgba.as_ptr(), rgba.len(), 4, 4, 4).expect("input should be accepted");
        assert_eq!(valid.1, 4);
        assert_eq!(valid.2, 4);
    }
}

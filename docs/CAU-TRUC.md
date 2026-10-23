# Bản đồ mã nguồn

| File/thư mục | Sửa gì ở đây? |
|---|---|
| `index.html` | Khung trang, logo, điều hướng và thứ tự tải script |
| `assets/css/base.css` | Kiểu giao diện gốc: thẻ, form, modal, responsive |
| `assets/css/v2.css` | Menu mới, ôn tập, tiến độ, cài đặt, theme sáng |
| `assets/css/typography.css` | Font Be Vietnam Pro, cỡ chữ, độ đậm, giãn dòng và chữ nhỏ trên điện thoại |
| `assets/css/dictionary.css` | Từ điển tra cứu gọn trên điện thoại, danh sách kết quả, phát âm và trang nghĩa |
| `assets/images/` | Logo SVG và bộ icon PWA PNG |
| `assets/js/core.js` | Kiểm tra bản sao, xử lý từ trùng, tìm kho, thuật toán thuần |
| `assets/js/review-engine.js` | Quy tắc lịch ôn, hàng chờ và chuỗi ngày; không dùng DOM |
| `assets/js/state.js` | Trạng thái chung và tên khóa dữ liệu cũ |
| `assets/js/storage.js` | Đọc/ghi localStorage, báo lỗi lưu, bộ thẻ theo ngày |
| `assets/js/ui.js` | SVG biểu tượng, toast, khung hộp thoại và thoát ký tự HTML |
| `assets/js/speech.js` | Bản ghi âm Kaikki và giọng đọc thiết bị dự phòng |
| `assets/js/features/days.js` | Trang Ngày, form thêm từ và danh sách từ |
| `assets/js/features/words.js` | Dán nhiều từ, sửa ví dụ/nghĩa, xóa và hoàn tác |
| `assets/js/features/study.js` | Phiên học, lật thẻ, ghép cặp, kết quả |
| `assets/js/features/dictionary.js` | Tải kho riêng, tra Anh/Việt trong toàn kho, phát âm và lưu từng từ từ trang nghĩa |
| `assets/js/features/autocomplete.js` | Gợi ý ở ô thêm từ trong ngày |
| `assets/js/features/review.js` | Hàng chờ nhiều ngày và ghi nhận lịch ôn |
| `assets/js/features/progress.js` | Hiển thị thống kê từ dữ liệu học thật |
| `assets/js/features/settings.js` | Cài đặt, theme, tải các tùy chọn đã lưu |
| `assets/js/features/quick-add.js` | Hộp thêm nhanh từ nút `+`, ví dụ và gợi ý |
| `assets/js/events.js` | Các hành động và phím tắt chung của bản gốc |
| `assets/js/navigation.js` | Điều phối hash route mới và route ngày/học |
| `assets/js/pwa.js` | Cài app, lưu kho ngoại tuyến, chấp nhận bản cập nhật |
| `assets/js/main.js` | Khởi động sau khi tất cả file đã tải |
| `data/dictionary.json.gz` | Kho FVDP lưu trữ, đang tắt |
| `manifest.webmanifest` | Tên cài đặt, màu, scope và icon PWA |
| `sw.js` | Quy tắc cache, ngoại tuyến, cập nhật |
| `precache-manifest.js` | Danh sách file và phiên bản cache được tạo sẵn |
| `tools/update-cache.py` | Chạy sau khi đổi mã để cập nhật phiên bản cache |
| `tools/serve.cjs` | Máy chủ local để kiểm tra, không dùng khi lên GitHub Pages |
| `tests/` | Kiểm thử dữ liệu, thao tác DOM mô phỏng, lịch ôn và service worker |

## Phụ thuộc giữa các file

`index.html` dùng `defer`, nên các script tải song song và chạy theo đúng thứ tự khai báo. Lõi chạy trước; trạng thái/UI/lưu trữ tiếp theo; file chức năng đăng ký thao tác; `main.js` gọi điều hướng và PWA cuối cùng.

Đây là cách chia theo chức năng bằng script cổ điển, không dùng ES Modules hoặc bundler. Các file cùng chia sẻ những biến/hàm được khai báo ở phạm vi ứng dụng; muốn đổi tên biến/hàm chung thì tìm toàn dự án trước khi sửa. Không tùy tiện đảo thứ tự các script.

Các file cũ đã được xuống dòng để dễ đọc; những khối HTML trong template literal giữ nguyên nội dung để hạn chế thay đổi giao diện ngoài yêu cầu.

## Kaikki đang hoạt động

| File | Chức năng |
|---|---|
| `assets/js/kaikki.js` | Đọc chỉ mục, tải shard theo nhu cầu, kiểm tra phiên bản, tạo nội dung thẻ |
| `assets/js/features/kaikki-word.js` | Chi tiết từng nghĩa, chọn nghĩa, âm thanh và quan hệ từ |
| `assets/css/kaikki.css` | Trình bày phần chi tiết và dữ liệu Kaikki trên thẻ |
| `data/kaikki/` | Chỉ mục, 27 phần dữ liệu, metadata và ghi nguồn |
| `tools/build-kaikki.py` | Chuẩn hóa nguồn tải từ Kaikki, tạo snapshot cố định |
| `docs/KAIKKI-THU-NGHIEM.md` | Phạm vi, hạn chế và cách thử |

`lexicon.js`, `features/word-relations.js`, `data/dictionary.json.gz`, `data/wordnet/` và bản dịch WordNet chỉ được giữ để khôi phục; không nạp trong `index.html`, cache hoặc bản build Vercel hiện tại.

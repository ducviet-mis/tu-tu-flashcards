# Từ Từ v2 — PWA và mã nguồn theo chức năng

Mục tiêu: giữ các chức năng đã có, thêm điều hướng Ngày / Ôn tập / Thêm nhanh / Tiến độ / Cài đặt, ví dụ cho từng từ và lịch ôn; triển khai trực tiếp từ GitHub Pages.

## Các quyết định

- HTML/CSS/JavaScript thuần, không framework, không npm và không bước build bắt buộc.
- Các script cổ điển dùng `defer`, chạy theo thứ tự rõ trong `index.html`. `state.js` khai báo trạng thái chung; mỗi file chức năng chỉ phụ trách một nhóm thao tác. Không ghép mã hay dùng `eval` khi chạy.
- `core.js` và `review-engine.js` độc lập với DOM. Hàm lịch ôn có kiểm thử riêng.
- `assets/js/features/` chia theo Ngày, từ vựng, lật/ghép, từ điển, gợi ý, sao lưu, đồng bộ, ôn tập, tiến độ, cài đặt và thêm nhanh.
- Kho từ gốc được giữ nguyên byte, tách thành `data/dictionary.json.gz`. Chỉ tải khi tra hoặc người dùng yêu cầu lưu ngoại tuyến.
- Giữ khóa lưu cũ `tungngay.v1` và `tungngay.cloud.v1`. Bản sao JSON cũ vẫn nhập được; ví dụ và lịch ôn đi cùng từ trong bản sao mới.
- Cài đặt và thống kê lượt học dùng khóa riêng, không đưa thông tin xác thực vào mã nguồn. Không tự bật đồng bộ, không xin quyền thông báo.
- Hẹn ôn: đã nhớ tăng mức với khoảng 1, 3, 7, 14, 30 ngày; chưa nhớ trở về hôm nay. Đây là lịch trong app, không phải nhắc giờ hay thông báo nền.
- Service worker chỉ lưu tài nguyên tĩnh được liệt kê và kho từ. Không lưu API Supabase, POST, bản sao người dùng hay các trang bên ngoài.
- `start_url` và `scope` tương đối, hoạt động cả ở tên miền gốc và thư mục `/ten-repository/`.
- Cập nhật phiên bản chờ người dùng bấm; kiểm tra phần đang nhập trước khi tải lại trang.

## Nguồn tham chiếu

File HTML (2) là bảng trình bày các màn hình, không phải mã ứng dụng hoạt động. Đã đọc các nhãn v2 gồm menu, ôn tập, thêm nhanh, tiến độ, cài đặt và thẻ ví dụ/hẹn ôn. Các khung iframe của tệp không hiển thị nội dung khi mở trong môi trường kiểm tra; giao diện mới tiếp tục bộ màu và logo đã duyệt, không khẳng định khớp chính xác mọi chi tiết của khung mẫu.

# Từ Từ PWA Implementation Plan

**Goal:** Tách app thành thư mục dễ sửa, thêm PWA và các chức năng v2 trong thiết kế.

**Architecture:** HTML/CSS/JS thuần, script defer theo thứ tự phụ thuộc, hai lõi thuần cho dữ liệu và lịch ôn; dữ liệu từ điển tải riêng. Service worker có danh sách tài nguyên tĩnh và cache theo phạm vi ứng dụng.

**Tech Stack:** JavaScript, Web Speech, localStorage, Cache API, service worker; Python chuẩn cho đóng gói/icon; Node test runner.

**Spec:** [THIET-KE.md](THIET-KE.md).

## Thực hiện

- [x] Tách HTML, CSS, logo, dữ liệu và các nhóm chức năng hiện có.
- [x] Thêm kiểm thử lịch ôn, sao lưu metadata và phạm vi service worker trước khi viết các chức năng mới.
- [x] Thêm hàng chờ ôn nhiều ngày, ví dụ, thêm nhanh, thống kê thật và cài đặt.
- [x] Thêm manifest, icon và cơ chế tải giao diện/kho từ ngoại tuyến.
- [x] Chạy kiểm thử hồi quy trên mã nguồn đã tách; sửa lỗi phát hiện được.
- [x] Kiểm tra các đường dẫn dưới thư mục GitHub Pages, kiểm tra kích thước và đóng gói ZIP.
- [x] Viết hướng dẫn chạy local, đưa lên GitHub Pages, cài trên Android/iPhone, chuyển dữ liệu.

## Các trường hợp cần kiểm tra

- Từ ở ngày cũ xuất hiện trong hàng chờ và được ghi đúng bộ ngày sau khi học.
- Nhập JSON cũ/mới bảo toàn ví dụ và lịch; dữ liệu hỏng không ghi đè vùng lưu.
- PWA không xóa cache của app khác trên cùng tên miền GitHub Pages.
- Bản cập nhật không tự tải lại trang khi đang học hoặc nhập từ.
- Tải offline từ điển riêng; không báo toàn bộ kho sẵn sàng nếu mới chỉ có giao diện.

# Sổ từ: Theo ngày và Chủ đề

- **Theo ngày:** thẻ ngày cao 96 px, chia 3 cột trên desktop rộng, 2 cột trên tablet và mobile. Chỉ số trên thẻ lấy từ dữ liệu đang lưu; mở sổ trống hôm nay không tạo dữ liệu mới.
- **Chủ đề:** gom các từ của mọi ngày theo nhãn `topic`. Không phân biệt hoa/thường, giữ dấu tiếng Việt. Từ cũ chưa có nhãn nằm trong “Chưa phân chủ đề”.
- **Tìm trong sổ:** tìm tiếng Anh, nghĩa tiếng Việt, tên chủ đề và ngày; hỗ trợ tiếng Việt không dấu. Trong một chủ đề, kết quả chỉ lấy từ của nhóm đó. Mỗi lần hiện tối đa 40 từ, có nút “Xem thêm từ”.
- **Gán chủ đề:** nhập nhãn tùy chọn khi thêm nhanh, thêm vào ngày, dán nhiều từ hoặc sửa từ. Các nhãn có sẵn xuất hiện trong danh sách gợi ý của trình duyệt. Sửa riêng chủ đề không thay đổi lịch ôn.
- Menu dưới tiếp tục bo tròn trên desktop/mobile. Font tiếp tục dùng Be Vietnam Pro.

## Mã nguồn

| Tệp | Chức năng |
|---|---|
| `assets/js/features/notebook.js` | Nhóm chủ đề, các chế độ xem, tìm trong sổ và thao tác từ |
| `assets/css/notebook.css` | Kích thước widget, thẻ gọn và bố cục responsive |
| `assets/js/core.js` | Kiểm tra và giữ trường `topic` khi đọc dữ liệu cũ |
| `features/quick-add.js`, `features/days.js`, `features/words.js`, `events.js` | Nhập và lưu chủ đề qua các cách thêm/sửa từ |

Không cần SQL mới hoặc dịch vụ bên ngoài cho thay đổi này. Chủ đề đi cùng từng từ trong dữ liệu lưu trên trình duyệt; bản cập nhật này không bổ sung đồng bộ tiến trình giữa tài khoản hoặc thiết bị.

## Kiểm tra

Đã chạy 113 kiểm tra tự động và build Vercel thành công. Các ca mới kiểm tra chuyển chế độ xem, nhóm từ nhiều ngày, tìm không dấu, thoát ký tự HTML, lưu chủ đề qua tải lại, thao tác đúng từ và giữ lịch ôn. Chưa xác minh bố cục trong trình duyệt thật ở môi trường tạo bản cập nhật này.

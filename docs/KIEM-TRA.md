# Kết quả kiểm tra

Ngày kiểm tra: 22/10/2026. Node test runner: **49 kiểm thử đạt, 0 lỗi**.

Lệnh chạy từ thư mục gốc dự án:

```bash
node --test tests/*.test.cjs tests/dom-check.cjs
```

## Những phần đã xác minh tự động

- Thêm/sửa/xóa từ, hoàn tác, dán nhiều dòng, chặn từ trùng và khôi phục localStorage.
- Gợi ý `he` ra `hello` trên kho thật; chọn gợi ý bằng chuột/phím, giữ nghĩa tự nhập.
- Giải nén đủ 371.705 mục, 668.511 dòng nghĩa; tìm tiếng Anh và tiếng Việt không dấu.
- Lật thẻ, đảo chiều, phím tắt, ghép cặp, kết quả, thoát bằng Esc và quay lại bằng hash route.
- Xuất/nhập JSON cũ và mới, bảo toàn ví dụ/lịch ôn, từ chối dữ liệu hỏng, không ghi đè thay đổi sau nhập khi hoàn tác.
- Thêm nhanh kèm ví dụ; ôn từ nhiều ngày và ghi kết quả đúng về bộ từ nguồn; thống kê lấy từ thao tác học; lưu mục tiêu/theme.
- Lịch ôn qua ranh giới tháng/năm; quên từ đưa về hôm nay; chuỗi ngày tính theo hoạt động thật.
- Ghép sai đưa từ có lịch xa trở lại hôm nay ngay cả khi thoát giữa lượt; link kết quả hết phiên quay lại bộ ngày an toàn.
- Đồng bộ Supabase bằng phản hồi giả lập: thành công, lỗi mạng, xung đột, phản hồi cũ và từ chối khóa đặc quyền.
- Manifest dùng scope tương đối; icon PNG đúng kích thước; tất cả đường dẫn tài nguyên trong HTML tồn tại; JS phân tích cú pháp thành công.
- Danh sách cache và dấu phiên bản khớp mã đã đóng gói; kho từ không nằm trong lượt cache giao diện ban đầu.
- Service worker giả lập dưới `/tu-tu/`: mở trang khi ngoại tuyến, tải kho rồi tra ngoại tuyến, giữ cache kho khi đổi giao diện, không xóa cache ứng dụng khác và không chặn API đồng bộ.

## Kích thước

| Phần | Kích thước |
|---|---:|
| `index.html` | 4.506 byte |
| 31 tài nguyên giao diện trong precache | 158.255 byte |
| Kho từ nén tải riêng | 7.725.550 byte |

Kho từ được giữ nguyên nội dung từ bản HTML trước; đã chuyển ra file gzip riêng, không đưa cả kho vào localStorage.

## Giới hạn kiểm tra

DOM trong bộ kiểm thử là mô phỏng, không đo bố cục hoặc khả năng hiển thị thật của trình duyệt. Môi trường làm việc chặn kết nối tới máy chủ local, nên chưa kiểm tra giao diện bằng trình duyệt thật, thao tác cài PWA trên Android/iOS hay đồng bộ Supabase thật. Không coi các kiểm thử mô phỏng là chứng nhận cho những phần này.

Sau khi triển khai GitHub Pages, cần kiểm tra trên thiết bị: thêm một từ, ôn/lật thẻ, cài từ menu trình duyệt, tải kho ngoại tuyến rồi bật chế độ máy bay và mở lại app. Nếu cập nhật phiên bản, kiểm tra nút cập nhật sau khi lưu phần đang nhập.

Tệp thiết kế tham chiếu hiển thị được các tiêu đề màn hình nhưng các iframe nội dung không hiển thị. Bản này triển khai các nhóm chức năng v2 đã nhận diện, tiếp nối phong cách và logo đang dùng; chưa xác nhận khớp từng chi tiết hình ảnh với tham chiếu.

## Bản cập nhật font

Đã chuyển giao diện sang Be Vietnam Pro, tăng cỡ chữ phụ, chỉnh giãn dòng và nhãn câu thường. Kiểm thử service worker bổ sung xác minh CSS/font được giữ khi ngoại tuyến và qua activation bằng phản hồi giả lập. Truy cập nhị phân tới Google Fonts/GitHub thất bại trong môi trường làm việc, nên chưa đóng gói file font cục bộ hoặc xác nhận font hiển thị thật trên trình duyệt. Font được lấy từ Google Fonts rồi cache sau khi có kết nối thành công; nếu chưa tải được sẽ dùng font hệ thống.

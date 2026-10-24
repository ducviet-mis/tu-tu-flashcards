# Lưu tiến trình theo tài khoản trên nhiều thiết bị

## Vì sao desktop có 11 lượt ôn nhưng mobile là 0?

Bản trước chỉ dùng Supabase Auth để đăng nhập. Sổ từ, lịch ôn, thống kê, cài đặt và tiến trình chủ đề vẫn nằm trong localStorage riêng của từng trình duyệt, chưa có đường lưu/tải theo tài khoản. Đăng nhập cùng email vì vậy chưa làm dữ liệu giống nhau.

Bản sửa bổ sung lưu tự động. Không có nút sao lưu hay nút đồng bộ thủ công.

## Bật trên Supabase và Vercel

1. Trong Supabase → SQL Editor → New query, chạy **toàn bộ** [dong_bo_tai_khoan.sql](dong_bo_tai_khoan.sql). File bổ sung này dùng 7 bảng đã tạo trước đó. Nếu dự án chưa có `so_tu`, `tu_vung` và các bảng cá nhân, chạy [tu_tu_supabase.sql](tu_tu_supabase.sql) trước, rồi chạy file bổ sung. Khi chạy lại cả hai file, luôn chạy file bổ sung sau cùng.
2. Đẩy mã nguồn mới lên GitHub để Vercel triển khai. Giữ cấu hình Supabase URL và publishable/anon key hiện có. Không có biến môi trường mới hay máy chủ riêng cần vận hành.
3. Trên **desktop đang có 11 lượt ôn**, mở lại bản web mới và đăng nhập đúng tài khoản. Trong menu avatar hoặc Hồ sơ, đợi **Đã lưu vào tài khoản**.
4. Trên mobile, mở lại bản mới, đăng nhập cùng tài khoản. Dữ liệu được tải tự động. Nếu cả hai máy đang mở, máy còn lại kiểm tra thay đổi mỗi 20 giây khi trang đang hiện; trở lại tab hoặc có mạng trở lại sẽ kiểm tra ngay.

Giữ nguyên dữ liệu trình duyệt desktop trong lúc chuyển bản. Không dùng Clear site data/xóa dữ liệu trang vì 11 lượt ôn cũ hiện đang nằm ở đó. Nếu PWA vẫn dùng bản cũ, dùng thông báo cập nhật của app hoặc tải lại trang; không cần xóa dữ liệu.

Nếu hiện **Chưa bật lưu theo tài khoản**, kiểm tra đã chạy SQL bổ sung trong đúng Supabase project mà Vercel đang kết nối và Data API có expose schema `public`. App tiếp tục giữ tiến trình trên thiết bị và sẽ thử lại; trạng thái này chưa có nghĩa dữ liệu đã lên tài khoản.

## Dữ liệu nào được lưu ở đâu?

| Dữ liệu | Nguồn lưu |
|---|---|
| Đăng nhập, tên hiển thị, thông tin người dùng | Supabase Auth; tên được làm mới khi tải lại/kiểm tra tài khoản |
| Sổ theo ngày | `so_tu` |
| Thẻ cá nhân, nghĩa, ví dụ, nhãn và thông tin nguồn Kaikki | `tu_vung`, cột `noi_dung_bo_sung` giữ metadata cần thiết |
| Trạng thái nhớ, cấp độ, hạn ôn, ngày ôn và số lần ôn từng thẻ | `tien_trinh_hoc` |
| Các lần học thật bằng lật thẻ/ghép từ | `lich_su_on_tap`, ID cố định để thử gửi lại không đếm trùng |
| Thống kê cũ trên trình duyệt | `thong_ke_hoc_cu` |
| Mục tiêu, tốc độ đọc, tự đọc, đảo chiều, theme | `cai_dat_nguoi_dung` |
| Tiến trình trong bộ chủ đề cố định | `tien_trinh_chu_de`, chỉ ID chủ đề/từ và trạng thái nhớ |
| Phiên bản dữ liệu và 8 từ vừa tra | `trang_thai_dong_bo` |
| Thống kê ngày, mục tiêu và chuỗi ngày ôn | View `thong_ke_hoc_theo_ngay` từ lịch sử thật + thống kê cũ |

Kho Kaikki, danh mục và nội dung đầy đủ của các bộ chủ đề vẫn là tệp chung của web. Không tải toàn bộ từ điển lên database. Khi dữ liệu chưa đổi, RPC chỉ trả phiên bản và xác nhận lượt đã nhận, không tải lại toàn bộ sổ.

## Chuyển dữ liệu cũ và bảo vệ dữ liệu

- Lần đầu mở bản mới khi đăng nhập, dữ liệu cũ trên trình duyệt được gắn một lần với tài khoản đang đăng nhập. Bản dữ liệu gốc vẫn được giữ nội bộ, không xóa. Dữ liệu cũ không có dấu chủ tài khoản để phân tách hồi tố, vì vậy nên mở desktop bằng đúng tài khoản đang sử dụng dữ liệu đó.
- Với thống kê cũ chỉ có tổng theo ngày, nhập lại từ hai bản sao dùng **giá trị lớn nhất theo ngày**, không cộng chồng hai bản sao giống nhau. Không thể suy ra chính xác các lượt riêng biệt trước nâng cấp nếu nhiều máy đã có tổng cũ khác nhau. Các lượt học mới có ID riêng và cộng đúng giữa các máy.
- Dữ liệu khách và từng tài khoản được tách riêng. Đăng xuất đóng phiên học, bỏ giao diện/bản nháp đang mở của tài khoản cũ và về vùng khách. Đăng nhập lại vẫn có bản lưu riêng của tài khoản, kể cả thay đổi đang chờ gửi khi mất mạng.
- Khi hai thiết bị sửa khác từ hoặc khác trường cài đặt, app gộp thay đổi thay vì ghi đè nguyên sổ. Xóa thẻ được giữ khi máy cũ kết nối lại. Nếu cùng sửa một trường khi ngoại tuyến, thay đổi chưa gửi được áp dụng khi kết nối lại; đây không phải trình soạn thảo cộng tác thời gian thực.
- Máy chủ chỉ ghi khi phiên bản vẫn khớp; nếu máy khác vừa sửa, app tải lại và gộp. Mỗi lần ghi là một giao dịch, không có trạng thái chỉ lưu nửa sổ. Lượt đã nhận được xác nhận để một lần gửi lại cũ không kéo tiến trình về trước.
- Tiếp tục học khi mất mạng; nhật ký chờ gửi được giữ trên máy theo tài khoản và theo tab. Chỉ báo phân biệt đã lưu trên thiết bị với đã lưu vào tài khoản. Việc làm mới nền giữ phiên học và nội dung đang nhập của cùng tài khoản.

## Kiểm tra sau triển khai

1. Ở desktop, đợi trạng thái đã lưu vào tài khoản, ghi nhớ số lượt hôm nay.
2. Mở mobile cùng tài khoản: kiểm tra Tiến độ, Sổ từ, chủ đề đã nhớ, mục tiêu và theme.
3. Ôn thêm một từ trên mobile; trở lại desktop, đợi cập nhật và kiểm tra tổng tăng một lượt.
4. Đổi tên trên một máy; làm mới trang/đợi kiểm tra tài khoản trên máy còn lại. Bản nháp đang sửa tên không bị ghi đè.
5. Ngắt mạng, học thêm, tải lại app, nối mạng trở lại: đợi đã lưu vào tài khoản rồi kiểm tra máy còn lại.
6. Đăng xuất và đăng nhập tài khoản khác trên cùng trình duyệt: không được thấy sổ hay bản nháp của tài khoản trước.

Có thể xem thống kê đã lên máy chủ trong SQL Editor (chỉ đọc):

```sql
select nguoi_dung_id, ngay_hoc, so_luot_on, so_luot_da_nho
from public.thong_ke_hoc_theo_ngay
order by ngay_hoc desc, nguoi_dung_id;
```

## Kiểm thử mã nguồn

```cmd
npm ci
npm test
npm run build
```

`@electric-sql/pglite` chỉ là phụ thuộc phát triển để chạy PostgreSQL trong kiểm thử; không nằm trong giao diện/bản triển khai và không yêu cầu người học cài database. Kiểm thử SQL chạy migration thật, giao dịch, RLS, phân tách tài khoản, chống đếm trùng, xử lý phiên bản, gỡ liên kết thẻ đã xóa và so sánh dữ liệu giữa hai client.

Kiểm thử cục bộ không thay thế việc mở web thật trên desktop/mobile và kiểm tra cấu hình Supabase của dự án. Không có quyền truy cập trực tiếp database hoặc dữ liệu tài khoản thật trong phiên sửa này.


## Cập nhật lịch ôn của Chủ đề (24/10/2026)

Sau khi cập nhật web, mở Supabase SQL Editor và chạy lại **toàn bộ** [dong_bo_tai_khoan.sql](dong_bo_tai_khoan.sql) bản mới. File có thể chạy lại, giữ dữ liệu và bổ sung các cột lịch ôn vào bảng `tien_trinh_chu_de`. Không đưa kho từ lên database. Cập nhật PWA trên các thiết bị để cùng dùng bản mới.

- Từ chủ đề đã được đánh giá nhớ/chưa nhớ xuất hiện ở Ôn tập; từ chưa học chưa vào hàng đợi.
- Chưa nhớ: ôn lại hôm nay. Nhớ lần đầu: hẹn ngày mai; các lượt đến lịch tiếp theo giãn 3, 7, 14 rồi 30 ngày. Sau mức cuối, tiếp tục mỗi 30 ngày.
- Học thêm trước ngày hẹn giữ lịch hiện tại. Quên một từ đặt lại mức đầu.
- Từ đã nhớ vẫn nằm ở Tất cả; hàng Đến lịch chỉ ẩn tạm đến ngày hẹn.
- Tiến trình cũ chỉ có nhớ/chưa nhớ vẫn được giữ. Các từ này xuất hiện một lượt để thiết lập lịch; app không đoán ngày ôn cũ.
- Cùng một từ ở hai chủ đề, hoặc trong sổ cá nhân, có tiến trình riêng. Học chủ đề không tạo từ trong sổ theo ngày.

Nếu chưa chạy SQL mới, lịch vẫn được giữ trên thiết bị và chờ lưu vào tài khoản; kiểm tra trạng thái trong menu avatar. Sau khi chạy SQL và kết nối lại, app tự thử lưu lại.

Thử kiểm tra: chọn Chưa nhớ ở một từ chủ đề → mở Ôn tập/Chưa nhớ → học lại và chọn Đã nhớ → xem ngày hẹn ở Tất cả → đăng nhập cùng tài khoản trên thiết bị khác để kiểm tra cùng ngày hẹn.

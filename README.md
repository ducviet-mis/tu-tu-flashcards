# TỪ TỪ

Lưu những từ tiếng Anh bạn muốn nhớ, rồi ôn bằng flashcard và ghép cặp. Bản v2 có hàng chờ ôn theo lịch, ví dụ cho từng từ, tiến độ học và khả năng cài như một ứng dụng.

## Chạy thử trên máy

Giải nén toàn bộ dự án vào một thư mục. Mở terminal ở thư mục có `index.html`, chọn **một** cách:

```bash
node tools/serve.cjs
```

Mở `http://127.0.0.1:8765/tu-tu/` để thử luôn đường dẫn có thư mục như GitHub Pages. Không cần `npm install`.

Hoặc, nếu máy có Python:

```bash
python -m http.server 8000
```

Mở `http://localhost:8000/`.

**Không bấm đúp `index.html` để kiểm tra PWA.** Service worker và tải kho từ cần HTTP trên localhost hoặc HTTPS. Dùng `file://` chỉ có thể thử một phần giao diện.

## Đưa lên GitHub Pages

1. Mở repository bạn vừa tạo, chọn **Add file → Upload files**.
2. Tải lên **nội dung bên trong thư mục dự án**: `index.html`, `assets`, `data`, `manifest.webmanifest`, `sw.js`, `precache-manifest.js` và các file đi kèm. `index.html` phải ở ngay gốc repository, không nằm thêm một cấp `tu-tu-web/`.
3. Commit các tệp. Giữ `LICENSE` và các thông tin nguồn trong `data/`.
4. Vào **Settings → Pages → Build and deployment**.
5. Chọn **Deploy from a branch**, nhánh **main**, thư mục **/(root)** rồi **Save**.
6. Khi GitHub báo triển khai xong, mở địa chỉ Pages mà GitHub cung cấp. Địa chỉ thường có dạng `https://TEN-TAI-KHOAN.github.io/TEN-REPOSITORY/`.

Không có bước build ứng dụng và không cần máy chủ riêng. Đường dẫn logo, CSS, JS, manifest và service worker đã dùng đường dẫn tương đối.

Tài liệu chính thức: [Cấu hình nguồn GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Cài trên điện thoại và dùng ngoại tuyến

- **Android/Chrome hoặc máy tính Chrome/Edge:** mở web → **Cài đặt → CÀI TỪ TỪ**, hoặc dùng mục cài ứng dụng trong menu trình duyệt khi được hỗ trợ.
- **iPhone/iPad:** mở bằng Safari → **Chia sẻ → Thêm vào Màn hình chính**. Tên menu có thể khác theo phiên bản hệ điều hành.
- Chờ Cài đặt hiển thị **giao diện đã sẵn sàng ngoại tuyến**.
- Chọn **TẢI KHO TỪ DÙNG NGOẠI TUYẾN** nếu muốn tra và gợi ý từ khi mất mạng. Kho Kaikki bản thử khoảng 59 MB; chỉ tải chỉ mục khoảng 2,6 MB khi bắt đầu tra, chi tiết tải theo chữ cái.
- Sau khi tải thành công, mở app từ biểu tượng trên màn hình chính và thử bật chế độ máy bay.

Giao diện và bộ thẻ cá nhân dùng ngoại tuyến sau khi cache sẵn sàng. Đăng nhập cần mạng; giọng đọc tùy thuộc các giọng có sẵn trên thiết bị. Font Be Vietnam Pro được đóng gói cùng ứng dụng. Trình duyệt/hệ điều hành có thể thu hồi bộ nhớ website.

PWA chỉ thêm khả năng cài đặt và ngoại tuyến. **Hẹn ôn là lịch trong app**, không tự gửi thông báo nền hoặc nhắc đúng giờ.

Toàn bộ giao diện dùng Be Vietnam Pro, được lưu trong `assets/fonts/` và cache cùng giao diện để dùng ngoại tuyến.

## Kaikki bản thử

Từ điển hiện dùng duy nhất Kaikki: 119.032 từ/cụm từ có nghĩa Việt, kèm chi tiết từ bản tiếng Anh. FVDP và WordNet vẫn giữ trong mã nguồn nhưng không được nạp hoặc cache; bản build Vercel bỏ qua các kho cũ. Thẻ đã lưu và tiến trình học không bị thay đổi. Xem [phạm vi và cách kiểm tra](docs/KAIKKI-THU-NGHIEM.md).

## Chủ đề có sẵn

Trong **Sổ từ → Chủ đề**, chọn một bộ tiếng Anh hằng ngày để xem toàn bộ từ, nghe phát âm và học lật thẻ/ghép từ. Bộ từ cố định; không có nút thêm/sửa/xóa từ trong bộ. Tiến trình nhớ từ được lưu riêng trên thiết bị, không tạo từ trong sổ theo ngày. [Chi tiết sử dụng và dữ liệu](docs/CHU-DE.md).

## Những phần mới

| Mục | Cách hoạt động |
|---|---|
| Ngày | Bộ thẻ theo ngày như phiên bản trước, kèm ô ví dụ tùy chọn |
| Ôn tập | Gom từ của tất cả các ngày; lọc đến lịch / chưa nhớ / tất cả |
| Nút `+` | Thêm từ và ví dụ vào hôm nay từ bất kỳ màn hình chính nào, có gợi ý từ kho |
| Ví dụ | Bạn tự nhập câu tiếng Anh và bản dịch; không tự bịa ví dụ từ từ điển |
| Hẹn ôn | Đã nhớ: 1 → 3 → 7 → 14 → 30 ngày; chưa nhớ: trở về hôm nay |
| Tiến độ | Vốn từ, số đã nhớ, chuỗi ngày, lượt ôn, biểu đồ 7 ngày, hoạt động 28 ngày |
| Cài đặt | Mục tiêu lượt ôn, tốc độ đọc, đọc tự động, đảo chiều mặc định, giao diện tối/sáng |
| PWA | Cài lên thiết bị, cache giao diện, tải kho riêng, thông báo bản cập nhật |

Tiến độ lượt học được tính từ thao tác thực tế trong bản v2; không dựng lại lịch sử cũ bằng số giả. Khi ghép sai, từ trở về cần ôn; sau khi ghép xong cặp, lượt tự đánh giá được ghi vào tiến độ.

## Dữ liệu trên thiết bị

Chức năng xuất/nhập file sao lưu đã được gỡ khỏi ứng dụng. Dữ liệu đang lưu vẫn được giữ trên cùng trình duyệt và địa chỉ website; không xóa khóa localStorage khi cập nhật.

Đăng nhập email hoặc Google dùng chung Supabase Auth. Sổ từ, lịch ôn, thống kê, chủ đề và cài đặt được tách theo tài khoản, có bản lưu trên thiết bị và tự lưu lên Supabase khi đã chạy SQL bổ sung. Xem [hướng dẫn lưu dữ liệu theo tài khoản](supabase/HUONG-DAN-DONG-BO.md). Cơ chế đồng bộ thủ công bằng mã kho đã được gỡ khỏi ứng dụng.

## Sửa mã nguồn

Xem [bản đồ mã nguồn](docs/CAU-TRUC.md). Sau khi đổi các tài nguyên ứng dụng, chạy:

```bash
python tools/update-cache.py
```

Tệp này cập nhật dấu phiên bản và danh sách cache; không nén hay build giao diện. Giữ bản được tạo sẵn nếu chỉ tải dự án lên GitHub mà không sửa gì.

Khi có bản mới, app hiện nút **CẬP NHẬT**. Người dùng chủ động bấm sau khi lưu từ/đóng lượt học; không tự tải lại giữa lúc học. Kho từ đã tải dùng cache riêng và không phải tải lại nếu dữ liệu kho chưa thay đổi.

## Kiểm thử

```bash
node --test tests/*.test.cjs tests/dom-check.cjs
```

Không cần cài dependency. [Báo cáo kiểm tra](docs/KIEM-TRA.md) ghi rõ những phần được chạy tự động và giới hạn kiểm tra trên thiết bị thật.

## Nguồn và giấy phép

App kèm kho Anh–Việt FVDP được phân phối theo GPL-3.0; xem `LICENSE` và `data/NGUON-DU-LIEU.md`. Kho gồm cả từ hiếm, thuật ngữ và nghĩa cũ; nên chọn nghĩa theo ngữ cảnh. Logo TỪ TỪ lấy từ bộ SVG người dùng cung cấp.

## Từ điển tra cứu

Nút kính lúp mở một ô tìm kiếm Anh/Việt trong toàn bộ 371.705 mục. Không có bộ lọc, chọn trang hay gợi ý chọn từ hàng loạt. Kết quả ưu tiên từ tiếng Anh khớp chính xác, rồi tiền tố; tìm nghĩa Việt hỗ trợ bỏ dấu. Mở từ để xem nghĩa đầy đủ, nghe phát âm và tùy chọn lưu riêng từ đó vào hôm nay. Danh sách giữ từ khóa, trang và vị trí cuộn khi quay lại. Nút phát âm dùng giọng tiếng Anh của thiết bị qua Web Speech; trình duyệt chưa hỗ trợ sẽ có thông báo rõ.


## Từ gần nghĩa và trái nghĩa

Trang chi tiết có quan hệ theo từng nghĩa từ Open English WordNet 2025, liên kết các dạng của từ và cho phép bấm để tra tiếp. Dữ liệu quan hệ được tải từng phần và giữ để dùng offline sau lần tải đầu. Xem [cấu trúc, dữ liệu và cách tái tạo](docs/TU-DIEN-LIEN-KET.md).


### Giao diện V3

- Trang chủ `#/`: tra từ Anh/Việt, lịch sử từ đã mở, hàng chờ ôn và các sổ từ gần đây. Lịch sử tra cứu được lưu riêng trên thiết bị; không dùng từ mẫu làm lịch sử mặc định.
- Sổ từ `#/notebook`: các ngày được nhóm theo tháng, với số từ và tiến độ thật. Màn hình chi tiết ngày và các đường dẫn học cũ vẫn dùng được.
- Menu nổi bo tròn trên desktop và mobile: Trang chủ, Ôn tập, thêm nhanh, Sổ từ, Tiến độ. Cài đặt nằm trong dropdown avatar ở góc trên bên phải; khoảng cách đáy có tính vùng an toàn của thiết bị.
- Mã giao diện mới: `assets/js/features/home.js`, `assets/css/v3.css`. Giữ font Be Vietnam Pro và các tuỳ chọn giao diện hiện có.

### Gợi ý tra từ ngay trên trang chủ

- Gõ từ tiếng Anh hoặc nghĩa tiếng Việt để xem tối đa 6 gợi ý có nghĩa ngay dưới ô tra.
- Bấm gợi ý để mở thẳng chi tiết từ; dùng phím lên/xuống và Enter để chọn. Escape đóng gợi ý. Enter khi chưa chọn mở danh sách kết quả đầy đủ.
- Dùng chung kho từ tải một lần và cache ngoại tuyến. Kết quả tiếng Việt được tìm theo từng đợt; thay từ khóa hoặc chuyển trang sẽ hủy lượt tìm cũ.
- Mã chức năng: `assets/js/features/home-lookup.js`; giao diện: `assets/css/v3.css`.

### Thanh menu bo tròn

- CSS menu tập trung tại `assets/css/navigation.css`, dùng chung bố cục 5 cột bằng nhau trên desktop và mobile. Các quy tắc menu cũ đã được bỏ khỏi V2/V3 để tránh chồng CSS.
- Nút cộng nằm gọn ở giữa thanh; kích thước vùng bấm 48–54 px. Icon có khung riêng, không phụ thuộc đường cơ sở chữ. Khoảng cách đáy có tính vùng an toàn của thiết bị.

### Thống nhất trạng thái và lịch ôn

- Đánh dấu nhớ/chưa nhớ trong sổ cập nhật lịch theo cùng quy tắc với lật thẻ và ghép cặp; thao tác đánh dấu không cộng lượt học hay chuỗi ngày ôn.
- Các mốc giữ nguyên: 1, 3, 7, 14, 30 ngày. Luyện thêm trước ngày hẹn không tăng cấp hoặc đẩy ngày hẹn xa hơn; lượt học thật vẫn được ghi nhận. Quên từ sẽ đưa về hôm nay và bắt đầu lại từ mốc 1 ngày khi nhớ lại.
- Từ chưa nhớ luôn vào hàng chờ, kể cả dữ liệu từ bản cũ còn giữ lịch ở tương lai.
- Kết quả và nút ôn lại chỉ chứa các từ chưa nhớ trong chính lượt vừa học; giữ đúng sổ ngày gốc khi ôn nhiều ngày.
- Chỉ đổi ví dụ hoặc lưu lại nội dung không đổi sẽ giữ lịch. Đổi từ hoặc nghĩa sẽ đưa từ về cần ôn lại.
- Dừng ghép cặp giữa chừng không hiện thông báo đã nhớ hết; lịch của các từ chưa trả lời được giữ nguyên.

### Supabase đăng nhập và dữ liệu cá nhân

Chạy `supabase/tu_tu_supabase.sql` trong Supabase SQL Editor để tạo 7 bảng tiếng Việt không dấu và bảng xem `thong_ke_hoc_theo_ngay`. File `supabase/schema.sql` là SQL của cơ chế đồng bộ bằng mã cũ, không còn được ứng dụng sử dụng.

Bản SQL mới tạo cấu trúc, ràng buộc và quyền truy cập cho dữ liệu học. App dùng Supabase Auth cho đăng nhập và RPC để tự lưu/tải dữ liệu học theo tài khoản. Sau SQL nền, chạy thêm `supabase/dong_bo_tai_khoan.sql` để bật phiên bản dữ liệu, tiến trình chủ đề và giao dịch đồng bộ. Xem [hướng dẫn bật lưu theo tài khoản](supabase/HUONG-DAN-DONG-BO.md).

`thong_ke_hoc_cu` chỉ nhập số liệu trước thời điểm chuyển đổi, dùng UPSERT theo tài khoản/ngày; không ghi cùng một lượt vào cả bảng này và lịch sử. RPC kiểm tra phiên bản chung của tài khoản và ghi sổ, tiến trình, cài đặt cùng lịch sử trong một giao dịch. Các lượt đã nhận được xác nhận để thử lại không kéo lùi tiến trình; số lượt từng từ được tăng từ sự kiện mới trên máy chủ.

## Giao diện V3 sáng/tối và đăng nhập

Giao diện theo file mẫu V3, giữ menu bo tròn dưới màn hình. Có các trang `#/login`, `#/register`, `#/forgot`, `#/reset-password`, `#/account`; đăng nhập bằng Supabase Auth, tên hiển thị lưu trong Auth. Sổ từ, lịch ôn, thống kê, tiến trình chủ đề và cài đặt tự lưu theo tài khoản sau khi chạy SQL bổ sung; chế độ khách giữ dữ liệu riêng trên thiết bị.

Xem [hướng dẫn cấu hình Supabase và Vercel](supabase/HUONG-DAN-DANG-NHAP.md). Vercel dùng `npm run build`, xuất thư mục `dist`, đọc `SUPABASE_URL` và `SUPABASE_PUBLISHABLE_KEY`. Đăng nhập Google cần bật provider riêng theo [hướng dẫn Google](supabase/HUONG-DAN-GOOGLE.md); đăng ký/xác nhận email công khai cần Custom SMTP. SDK và phông chữ mẫu được lưu cùng mã nguồn để giao diện có thể dùng ngoại tuyến.

### Cài đặt áp dụng ngay

- Tối / Sáng / Tự động đổi giao diện ngay khi bấm, đồng nhất giữa Cài đặt và dropdown avatar.
- Mục tiêu lượt ôn, tốc độ đọc và các công tắc tự lưu trên thiết bị khi thay đổi; không có bước bấm Lưu cài đặt.
- Không còn giao diện sao lưu bằng file hoặc đồng bộ thủ công. Đăng nhập Supabase Auth và dữ liệu hiện có được giữ nguyên.


### Tài khoản và nhiều thiết bị

Để desktop/mobile dùng cùng dữ liệu, chạy [SQL bổ sung](supabase/dong_bo_tai_khoan.sql), triển khai web mới rồi mở lại desktop còn dữ liệu cũ trước. Hướng dẫn đầy đủ và cách kiểm tra 11 lượt ôn: [HUONG-DAN-DONG-BO.md](supabase/HUONG-DAN-DONG-BO.md). Không có nút sao lưu/đồng bộ thủ công; trạng thái lưu nằm trong menu avatar/Hồ sơ.

Kiểm thử: `npm ci` rồi `npm test`. PGlite chỉ dùng trong kiểm thử để chạy migration PostgreSQL/RLS thật, không nằm trong bản web.

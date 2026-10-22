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
- Chọn **TẢI KHO TỪ DÙNG NGOẠI TUYẾN** nếu muốn tra và gợi ý từ khi mất mạng. Kho khoảng 7,7 MB; không tải cùng trang chủ lần đầu.
- Sau khi tải thành công, mở app từ biểu tượng trên màn hình chính và thử bật chế độ máy bay.

Giao diện và bộ thẻ cá nhân dùng ngoại tuyến sau khi cache sẵn sàng. Đồng bộ cần mạng; giọng đọc tùy thuộc các giọng có sẵn trên thiết bị. Font có thể dùng font thay thế nếu chưa tải được Google Fonts. Trình duyệt/hệ điều hành có thể thu hồi bộ nhớ website; xuất bản sao định kỳ.

PWA chỉ thêm khả năng cài đặt và ngoại tuyến. **Hẹn ôn là lịch trong app**, không tự gửi thông báo nền hoặc nhắc đúng giờ.

Toàn bộ giao diện dùng Be Vietnam Pro, với nội dung 16 px và giãn dòng 1,6. Font hiện lấy từ Google Fonts ở lần truy cập có mạng, sau đó service worker cố gắng lưu cả CSS và font để dùng ngoại tuyến. Nếu chưa tải thành công, app dùng font hệ thống. Bản ZIP chưa kèm file font: môi trường tạo bản này không tải được dữ liệu nhị phân từ nguồn font.

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

## Chuyển dữ liệu từ bản HTML cũ

1. Mở **bản cũ**, chọn **Sao lưu → Xuất file**.
2. Mở **địa chỉ web mới**, chọn **Cài đặt → Sao lưu / Khôi phục → Nhập file**.
3. Chọn gộp hoặc thay thế theo nhu cầu.

Trình duyệt lưu dữ liệu theo địa chỉ website. Dữ liệu ở file trên máy không tự xuất hiện ở địa chỉ GitHub Pages. App giữ nguyên các khóa cũ, vì vậy dữ liệu tiếp tục được dùng nếu bạn thay phiên bản trên đúng cùng địa chỉ.

Bản sao mới giữ từ, nghĩa, trạng thái, ví dụ và lịch ôn. Thống kê lượt học và cài đặt giao diện hiện lưu riêng theo thiết bị, không đi theo bản sao từ hoặc Supabase.

## Đồng bộ Supabase (tùy chọn)

SQL nằm trong `supabase/schema.sql`. Chạy SQL trên dự án của bạn rồi mở mục đồng bộ trong app. Chỉ dùng URL dự án và khóa publishable/anon, cùng mã đồng bộ riêng. Không đưa khóa secret/service role hoặc mã kho cá nhân vào repository.

App vẫn dùng được nếu không cấu hình Supabase. Không cache các yêu cầu đồng bộ trong service worker.

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
- Menu nổi bo tròn trên desktop và mobile: Trang chủ, Ôn tập, thêm nhanh, Sổ từ, Tiến độ. Cài đặt chuyển lên góc trên; khoảng cách đáy có tính vùng an toàn của thiết bị.
- Mã giao diện mới: `assets/js/features/home.js`, `assets/css/v3.css`. Giữ font Be Vietnam Pro và các tuỳ chọn giao diện hiện có.

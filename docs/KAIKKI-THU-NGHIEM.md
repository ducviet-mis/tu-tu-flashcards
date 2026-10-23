# Kaikki trong Từ Từ — bản thử

Kaikki hiện là nguồn duy nhất cho tra cứu, gợi ý từ và chi tiết từ. FVDP/WordNet vẫn nằm trong dự án để khôi phục khi cần, nhưng không được gọi làm nguồn dự phòng. Bản build Vercel không phát hành dữ liệu hoặc script của hai nguồn cũ.

## Chạy thử

Mở terminal trong thư mục dự án và chạy:

```cmd
node tools/serve.cjs
```

Mở http://127.0.0.1:8765/tu-tu/ bằng trình duyệt cập nhật. Nếu app cũ đã được cài PWA, lưu xong phần đang học rồi bấm **Cập nhật** khi có thông báo.

Thử tra `hello`, `light`, `threshold`, hoặc nghĩa Việt `chào anh`, `ngưỡng`. Mở từng nghĩa, chọn **Chọn nghĩa này** rồi lưu. Các nghĩa tiếng Anh nằm trong mục mở rộng riêng: ví dụ của một nghĩa Anh không tự gắn vào nghĩa Việt chỉ vì cùng tên từ.

Thẻ mới từ chi tiết lưu nghĩa đã chọn, ví dụ/dịch ví dụ nếu có, IPA, đường dẫn âm thanh, đồng nghĩa/trái nghĩa của chính nghĩa đó và nguồn. Có thể sửa nghĩa trước khi lưu. Trong lúc tải chi tiết, nút lưu tạm khóa. Nếu tải lỗi, có thể thử lại hoặc lưu riêng nghĩa đã nhập; app báo rõ lúc này chưa có chi tiết bổ sung. Thẻ cũ và tiến trình học giữ nguyên.

## Phạm vi dữ liệu thực tế

Bản thử gồm **119.032** từ/cụm từ có nghĩa Việt, bổ sung dữ liệu tiếng Anh của các mục trùng tên. Chưa đưa toàn bộ hàng triệu mục tiếng Anh vào app và chưa có bộ chủ đề học được tuyển chọn.

| Thông tin có trong ít nhất một nghĩa của từ | Số mục từ |
|---|---:|
| Chi tiết từ bản tiếng Anh | 102.319 |
| IPA | 42.392 |
| Đường dẫn bản ghi âm | 40.463 |
| Ví dụ | 55.077 |
| Ví dụ kèm bản dịch | 9.987 |
| Đồng nghĩa | 29.292 |

Một từ có ví dụ không có nghĩa mọi nghĩa của từ đều có ví dụ. Dữ liệu nguồn có thể chứa từ hiếm, cách dùng cũ, trích dẫn dài hoặc quan hệ chưa gắn với một nghĩa cụ thể. Giao diện đánh dấu phần còn thiếu và đặt quan hệ chung ở khu vực riêng; không tự sinh thêm nội dung.

Chỉ mục nén khoảng **2,6 MB**; chi tiết chia thành 27 tệp theo chữ cái, tải theo nhu cầu. Tổng dữ liệu nén khoảng **59 MB**, không tải hết khi mở trang chủ. Cài đặt → Từ điển ngoại tuyến tải toàn bộ, có tiến trình và kiểm tra đã lưu đủ. Trình duyệt có thể thu hồi cache khi thiếu dung lượng.

Âm thanh thật được phát từ Wikimedia Commons khi có mạng; liên kết nguồn bản ghi âm hiển thị trong chi tiết. Nếu thiếu hoặc tải lỗi, app dùng giọng thiết bị và báo rõ. Giọng thiết bị hoạt động ngoại tuyến hay không tùy hệ điều hành và giọng đã cài.

## Nguồn và tái tạo dữ liệu

- [Kaikki — Vietnamese Wiktionary](https://kaikki.org/viwiktionary/), lọc các mục tiếng Anh.
- [Kaikki — English dictionary](https://kaikki.org/dictionary/English/), chỉ bổ sung các từ thuộc chỉ mục Việt.
- [Ghi nguồn và giấy phép](../data/kaikki/NOTICE.txt); mã SHA-256 nguồn, phiên bản và số liệu nằm trong `data/kaikki/metadata.json`.

Bản tiếng Anh đang dùng là snapshot hậu xử lý cũ do Kaikki cung cấp. Kaikki hiện ưu tiên raw extracts; đây là snapshot cố định cho thử nghiệm, không cập nhật tự động khi người dùng mở app. Không cần server từ điển riêng hoặc khóa API.

Để dựng lại, tải hai tệp nguồn được ghi trong NOTICE vào một thư mục làm việc ngoài bản triển khai, rồi chạy:

```cmd
python tools/build-kaikki.py --vi PATH_TO_VI_GZ --en PATH_TO_EN_GZ --work PATH_TO_WORK --output data/kaikki
python tools/update-cache.py
npm run build
```

Builder đọc `common.json` trong thư mục làm việc nếu có (Corpora CC0) để xếp hạng gợi ý. Lưu lại đúng tệp này khi muốn tái tạo cùng nhãn phổ biến. Khi đổi quy tắc chuẩn hóa, tăng phiên bản snapshot trong builder, dựng lại mọi shard và manifest cùng lúc. Không trộn shard từ hai lần dựng.

## Kiểm tra

```cmd
node --max-semi-space-size=4 --test --test-concurrency=1 tests/*.test.cjs tests/dom-check.cjs
npm run build
```

Các bài kiểm tra FVDP/WordNet chỉ đọc dữ liệu lưu trữ hoặc nạp script cũ qua test harness riêng; trang thật không nạp chúng. Cần thử thêm trên điện thoại thật để kiểm tra giọng đọc, thao tác lật thẻ và dung lượng ngoại tuyến.

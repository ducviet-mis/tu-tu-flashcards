# Từ điển có liên kết

Mục tiêu: tra một từ, hiểu từng nghĩa và khám phá từ gần nghĩa, trái nghĩa,
các dạng biến đổi mà không trộn quan hệ của những nghĩa khác nhau.

## Dữ liệu và giới hạn

- Kho Anh–Việt FVDP vẫn dùng cho tìm kiếm, nghĩa tiếng Việt và thêm thẻ.
- Quan hệ từ lấy từ **Open English WordNet 2025**: 128.009 mục từ,
  185.129 nghĩa; giữ nguyên định danh nghĩa và đích của từng quan hệ.
- Đồng nghĩa lấy từ cùng một synset; tính từ có thêm quan hệ `similar` của
  nguồn. Chúng được ghi là “Gần nghĩa”, không cam kết thay thế trong mọi câu.
- Trái nghĩa chỉ lấy quan hệ `antonym` trực tiếp của nghĩa gốc. Không suy ra
  trái nghĩa từ một nghĩa khác, từ cách viết, hoặc một phép đo độ giống nhau.
- “Từ liên quan” lấy quan hệ `also` và `derivation`; không gắn nhãn chúng
  là đồng nghĩa. Ví dụ của từng nghĩa lấy nguyên từ nguồn WordNet.
- 50 nhãn nghĩa tiếng Việt riêng được biên soạn trong `data/wordnet-vi.json`,
  dùng định danh nghĩa làm khóa. Các nghĩa khác giữ định nghĩa tiếng Anh;
  danh sách nghĩa Anh–Việt cũ nằm riêng trong phần mở rộng, không tự ghép
  theo vị trí. Đây chưa phải một bản dịch Việt đầy đủ của WordNet.
- Từ không có quan hệ trong nguồn sẽ không được tự tạo gần nghĩa/trái nghĩa.
- Các tên chỉ khác hoa/thường được giữ thành các mục riêng trong dữ liệu,
  tránh mất các nghĩa như Polish/polish. Tra cứu ưu tiên đúng cách viết.

## Hành vi giao diện

- Mở đầu mục để nghe phát âm và xem ba nghĩa đầu; mở rộng để xem nghĩa khác.
- Một số nghĩa thông dụng được ưu tiên bằng biên tập; các nghĩa còn lại giữ
  thứ tự nguồn, không tuyên bố đó là thứ tự tần suất.
- Mỗi nghĩa có nhóm gần nghĩa, trái nghĩa và từ liên quan khi có dữ liệu.
  Gợi ý quen thuộc được đưa trước; danh sách dài có phần mở rộng.
- Bấm từ liên quan mở đúng định danh nghĩa đích. Quay lại khôi phục từ và
  vị trí trước đó, rồi trở về ô tìm kiếm ban đầu. Lịch sử tối đa 30 bước.
- `ate`/`eaten` liên kết về `eat`. Các dạng có nghĩa độc lập như `left`
  vẫn giữ đầu mục riêng và có liên kết sang từ gốc. Dạng biến đổi lấy từ
  nguồn và một số quy tắc hậu tố, chỉ chấp nhận khi từ gốc tồn tại với từ loại
  phù hợp; không tự đoán từ gốc không có trong dữ liệu.
- Khi mở một nghĩa đích đã có bản dịch riêng, ô lưu thẻ dùng đúng bản dịch đó.
  Nghĩa đích chưa có bản dịch riêng yêu cầu người dùng nhập nghĩa muốn lưu.
  Phản hồi tải muộn không được ghi đè nội dung người dùng đã sửa.
- Lỗi tải quan hệ có nút thử lại; nghĩa Anh–Việt và phát âm vẫn sử dụng được.

## Cấu trúc

| Tệp | Vai trò |
|---|---|
| `assets/js/lexicon.js` | Hàm thuần cho từ gốc, thứ tự nghĩa và quan hệ |
| `assets/js/features/word-relations.js` | Tải dữ liệu, trang chi tiết và điều hướng liên kết |
| `assets/js/features/dictionary.js` | Tìm Anh/Việt, phân trang, lưu thẻ và nguồn dữ liệu |
| `data/wordnet/*.json.gz` | Các phần WordNet chia theo chữ đầu; index chứa biến thể và nguồn |
| `data/wordnet-vi.json` | Nhãn Việt và ưu tiên biên tập theo định danh nghĩa |
| `data/WORDNET-NOTICE.txt` | Ghi công, thay đổi và giấy phép dữ liệu |
| `tools/build-wordnet.py` | Chuyển bộ nguồn chính thức thành dữ liệu app |

Tổng WordNet nén khoảng 14,3 MB, không tải cùng giao diện ban đầu. Chỉ tải
index và phần chữ đầu cần tra; mỗi phần đã tải được service worker giữ để
dùng offline. Bộ nhớ ứng dụng giữ tối đa ba phần dữ liệu cùng lúc; cache
offline được trình duyệt quản lý. Không có API từ điển ngoài ở thời điểm tra.

## Tái tạo và kiểm tra

Tải JSON ZIP ở https://en-word.net/downloads rồi chạy từ thư mục repo:

```cmd
python tools/build-wordnet.py "duong-dan\english-wordnet-2025-json.zip"
python tools/update-cache.py
node --test tests/*.test.cjs tests/dom-check.cjs
```

Phiên bản nguồn, SHA-256 và mô tả chuyển đổi nằm trong
`data/wordnet/source.json`. Sau khi chỉnh nhãn Việt hoặc mã ứng dụng phải
chạy lại `tools/update-cache.py` để PWA nhận phiên bản mới.

Các kiểm tra gồm: tính toàn vẹn đích quan hệ trên toàn bộ dữ liệu; light
nhẹ/nhạt màu không lẫn heavy/dark; biến thể eat; không bịa trái nghĩa apple;
đi tới đúng nghĩa và quay lại; chọn nghĩa để lưu; tải lỗi/thử lại; phản hồi
muộn; bộ nhớ cache offline và cache revision.

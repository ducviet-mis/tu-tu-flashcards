# Bộ từ theo chủ đề

Vào **Sổ từ → Chủ đề**. Chọn một bộ để xem toàn bộ từ trong bộ, tìm theo tiếng Anh hoặc nghĩa Việt, nghe phát âm, rồi bấm **Lật thẻ** hoặc **Ghép từ**.

- Bộ từ có sẵn, không có thao tác thêm/sửa/xóa thành viên.
- Lật thẻ dùng cùng thao tác hiện tại: bấm/Space để lật, tự đánh giá đã nhớ/chưa nhớ, đảo chiều, xáo trộn và nghe phát âm.
- Ghép từ dùng tối đa 6 cặp mỗi màn hình. Ghép xong chuyển tiếp cho đến hết bộ, kể cả phần cuối chỉ còn 1–2 cặp.
- Đóng lượt học trở về đúng chủ đề. Kết quả có thể mở lượt lật lại những từ đã gặp nhưng chưa nhớ.
- Tiến trình được lưu trên cùng thiết bị/trình duyệt. Học chủ đề không tự thêm từ vào sổ theo ngày, không thay đổi lịch ôn của từ cá nhân. Lượt học thực tế vẫn được tính vào thống kê hoạt động.
- Các nhãn từng gắn vào từ cá nhân vẫn xem được qua **Nhãn từ cá nhân** ở phần Theo ngày. Chúng không thay đổi bộ chủ đề cố định.

## Giao diện

Giữ Be Vietnam Pro, theme sáng/tối, màu thẻ và menu bo tròn hiện tại. Danh mục dùng 3 cột trên desktop, 2 cột trên tablet/mobile; danh sách từ dùng 2 cột desktop và 1 cột mobile. Các nút học và phát âm có vùng bấm phù hợp cảm ứng. Danh sách không cắt bớt bằng phân trang hoặc nút xem thêm.

## Dữ liệu

Danh mục được chuẩn bị từ bảng `categories` của **Linguabase**, chọn các nhóm gần đời sống và chỉ giữ những mục có nghĩa Việt dùng được trong snapshot Kaikki của app. Từ danh sách `members` của từng nhóm nguồn, chỉ giữ các từ thông dụng đã chọn trong `tools/topic-selections.json` và tìm nghĩa khớp ngữ cảnh tiếng Việt tương ứng. Từ không khớp Kaikki hoặc không có nghĩa phù hợp sẽ bị bỏ qua; không tự dùng nghĩa đầu tiên để lấp chỗ trống.

Nghĩa, ví dụ, IPA và đường dẫn âm thanh đều lấy từ **Kaikki/Wiktionary**. Ví dụ chỉ đi cùng chính nghĩa nguồn đó. Với các biến thể như số nhiều hoặc danh động từ, builder chỉ lần về từ gốc khi nguồn ghi rõ quan hệ; giữ cách viết và phát âm của biến thể, không mượn âm thanh từ gốc. Một số từ có nghĩa khác nhau giữa các bộ, chẳng hạn màu sắc và trái cây, sẽ dùng các nghĩa nguồn khác nhau.

Đây là bộ cố định dành cho flashcard, không phải giáo trình hay phân loại CEFR. Các nguồn có thể còn lỗi ngôn ngữ; không khẳng định đã kiểm duyệt thủ công từng từ. Số lượng thực tế, phiên bản và mã SHA nguồn được ghi trong `data/topics/metadata.json`.

Chỉ thêm một tệp catalog nhỏ vào app, không tải cả cơ sở dữ liệu Linguabase nhiều GB. Catalog và giao diện được PWA lưu ngoại tuyến cùng phiên bản. Bản ghi âm cần mạng; khi không tải được, app dùng giọng thiết bị nếu có. Giọng thiết bị hoạt động ngoại tuyến tùy hệ điều hành.

Nguồn và giấy phép: [Linguabase CC0](https://huggingface.co/datasets/linguabase/linguabase), [NOTICE của chủ đề](../data/topics/NOTICE.txt), [NOTICE của Kaikki](../data/kaikki/NOTICE.txt).

## Mã nguồn

| Tệp | Vai trò |
|---|---|
| `assets/js/topics.js` | Tải, kiểm tra và khóa dữ liệu catalog |
| `assets/js/features/topics.js` | Danh mục, danh sách từ, tìm kiếm, tiến trình riêng |
| `assets/js/features/topic-study.js` | Phiên học chủ đề và các vòng ghép từ |
| `assets/css/topics.css` | Giao diện desktop/mobile theo theme chung |
| `data/topics/catalog.json` | Các bộ từ cố định và nội dung thẻ |
| `tools/build-topics.py` | Chuẩn bị dữ liệu nguồn thành catalog |
| `tools/topic-selections.json` | Từ nguồn đã chọn và tiêu chí chọn đúng nghĩa theo chủ đề |

Để dựng lại từ đúng snapshot nguồn:

```cmd
python tools/build-topics.py --source PATH_TO_CATEGORIES_TSV_GZ
python tools/update-cache.py
node --max-semi-space-size=4 --test --test-concurrency=1 tests/*.test.cjs tests/dom-check.cjs
npm run build
```

Không cần Supabase mới, API key hay máy chủ chạy liên tục. Không lưu raw archive nguồn vào bản triển khai.

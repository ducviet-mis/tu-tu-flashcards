# Nguồn dữ liệu kho từ Từng Ngày

Bản tích hợp ngày 22/10/2026 gồm **371.705 mục từ và cụm từ** với **668.511 dòng nghĩa** sau xử lý. Các số đếm này là số mục và dòng trong bản tích hợp, không phải số từ thông dụng hay số nghĩa đã được biên tập độc lập.

## Từ điển Anh–Việt

- Công trình gốc: **Free Vietnamese Dictionary Project — Hồ Ngọc Đức và các cộng tác viên**.
- Copyright (C) 1997–2003 The Free Vietnamese Dictionary Project.
- Metadata bản gốc ghi ngày cập nhật 2004-07-01; một phần thuật ngữ gốc được nhập từ VACETS Dictionary Project.
- Bản đóng gói đầu vào: **tecxmate/vnme-data**, release **v1.0.0**, tệp `vn_en_dictionary.db`, 84.377.600 byte.
- Nguồn: https://github.com/tecxmate/vnme-data
- Tệp gốc: https://github.com/tecxmate/vnme-data/releases/download/v1.0.0/vn_en_dictionary.db
- SHA-256 tệp đầu vào: `b030f464e3b451e410fbde74f354fead17ca19bf8ac6dda05a224f025cfe5dcc`.
- Giấy phép bản đóng gói: **GPL-3.0**, xem toàn văn `GPL-3.0.txt` và mục nguồn ngay trong app.

Chỉ lấy các bản ghi được gắn nguồn **FVDP (GPL)** trong database. Các bản ghi mang nguồn **AI_Generated_EN** không nằm trong kho tích hợp.

Các thay đổi: chuẩn hóa Unicode/khoảng trắng; bỏ mục siêu dữ liệu và mục không hợp lệ; trích nghĩa thành chữ thuần; gộp dòng nghĩa trùng; giữ tiêu đề của thành ngữ/cụm từ trong các dòng `⟦cụm: ...⟧`; gợi ý nghĩa cho thẻ ưu tiên nghĩa độc lập của từ gốc. Bản hiện tại đã được kiểm tra cấu trúc và đối chiếu một số mục, chưa kiểm chứng thủ công từng mục từ.

Kho có cả tên riêng, viết tắt, thuật ngữ chuyên ngành và cách dùng cũ. Nguồn gốc hoặc một số bản ghi có thể ngắn/cắt bớt nội dung. Bạn nên mở **XEM NGHĨA**, chọn nghĩa theo ngữ cảnh và chỉnh lại câu chữ trước khi học. Những ví dụ và phiên âm có thể có ở nguồn đầu vào không được đưa toàn bộ vào bản flashcard này; app sử dụng giọng đọc Web Speech API.

## Danh sách gợi ý phổ biến

**Darius Kazemi và các cộng tác viên — Corpora**, dữ liệu `data/words/common.json`.

- Nguồn: https://github.com/dariusk/corpora/blob/master/data/words/common.json
- Giấy phép: **CC0 1.0** — https://creativecommons.org/publicdomain/zero/1.0/
- Danh sách nguồn có 980 chuỗi; bản tích hợp gắn nhãn **972 mục khớp**.
- Nhóm này là gợi ý để bắt đầu, không phải bộ CEFR, TOEIC hay Oxford chính thức.

## Phân phối và mã nguồn

Dữ liệu từ điển phái sinh và bản app kèm kho được cung cấp theo **GPL-3.0**, không có bảo hành. HTML, CSS và JavaScript của app ở dạng mã nguồn ngay trong `index.html`. Dữ liệu JSON được nén gzip/base64 bên trong HTML và có thể giải nén hoàn toàn bằng script `nguon/giai-nen-kho.py` đi kèm. Script xử lý nguồn `nguon/build-vocabulary.py` và danh sách Corpora cũng được cung cấp.

Để học bình thường, bạn chỉ cần mở `index.html`; không cần chạy các script hoặc cài Python/Node.

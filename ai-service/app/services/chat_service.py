import re
import unicodedata

from app.services.search_service import search_all
from app.services.statistics_service import (
    get_overview_statistics,
    get_billing_insight
)


# =========================================================
# TEXT HELPERS
# =========================================================

def remove_accents(text: str):
    text = str(text or "")

    normalized = unicodedata.normalize(
        "NFD",
        text
    )

    return "".join(
        char
        for char in normalized
        if unicodedata.category(char) != "Mn"
    )


def normalize_text(text: str):
    text = remove_accents(text)

    text = text.lower().strip()

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text


def format_money(value):
    try:
        return f"{float(value):,.0f}".replace(",", ".")
    except Exception:
        return "0"


# =========================================================
# SEARCH QUERY EXTRACTION
# =========================================================

def extract_search_keyword(message: str):
    """
    Ví dụ:

    tìm xe của Bảo
        -> Bảo

    tìm cư dân tên Nguyễn Văn A
        -> Nguyễn Văn A

    xe biển số 30K
        -> 30K
    """

    original = str(message or "").strip()

    patterns = [
        r"(?i)^tìm kiếm\s+",
        r"(?i)^tìm\s+",
        r"(?i)^tra cứu\s+",
        r"(?i)^kiểm tra\s+",
    ]

    result = original

    for pattern in patterns:
        result = re.sub(
            pattern,
            "",
            result
        )

    removable_phrases = [
        "cư dân tên",
        "cư dân",
        "người tên",
        "xe của",
        "xe biển số",
        "biển số xe",
        "biển số",
        "phương tiện của",
        "phương tiện",
        "căn hộ",
        "hợp đồng của",
        "hợp đồng",
        "hóa đơn của",
        "hoá đơn của",
        "hóa đơn",
        "hoá đơn",
        "của"
    ]

    lower_result = result.lower()

    for phrase in removable_phrases:
        if lower_result.startswith(phrase):
            result = result[len(phrase):].strip()
            lower_result = result.lower()

    return result.strip(" ?!.,;")


# =========================================================
# SEARCH RESULT FILTER
# =========================================================

def detect_entity_type(normalized_message: str):
    if any(
        word in normalized_message
        for word in [
            "cu dan",
            "nguoi dan",
            "resident"
        ]
    ):
        return "RESIDENT"

    if any(
        word in normalized_message
        for word in [
            "xe",
            "phuong tien",
            "bien so"
        ]
    ):
        return "VEHICLE"

    if any(
        word in normalized_message
        for word in [
            "can ho",
            "apartment"
        ]
    ):
        return "APARTMENT"

    if any(
        word in normalized_message
        for word in [
            "hop dong",
            "contract"
        ]
    ):
        return "CONTRACT"

    if any(
        word in normalized_message
        for word in [
            "hoa don",
            "invoice"
        ]
    ):
        return "INVOICE"

    return None


# =========================================================
# SEARCH RESPONSE
# =========================================================

def build_search_answer(
    message: str,
    normalized_message: str
):
    keyword = extract_search_keyword(
        message
    )

    if not keyword:
        return {
            "success": True,
            "type": "SEARCH",
            "answer": (
                "Bạn hãy nhập thêm từ khóa cần tìm. "
                "Ví dụ: “tìm xe của Bảo” hoặc "
                "“tìm cư dân tên Nguyễn Văn A”."
            ),
            "data": []
        }

    result = search_all(
        keyword
    )

    if not result.get("success"):
        return {
            "success": False,
            "type": "SEARCH",
            "answer": (
                "Không thể tìm kiếm dữ liệu lúc này."
            ),
            "message": result.get(
                "message"
            )
        }

    rows = result.get(
        "data",
        []
    )

    entity_type = detect_entity_type(
        normalized_message
    )

    if entity_type:
        filtered_rows = [
            row
            for row in rows
            if row.get("type") == entity_type
        ]
    else:
        filtered_rows = rows

    if not filtered_rows:
        return {
            "success": True,
            "type": "SEARCH",
            "answer": (
                f'Không tìm thấy kết quả phù hợp '
                f'với "{keyword}".'
            ),
            "data": []
        }

    preview = filtered_rows[:5]

    lines = []

    for index, item in enumerate(
        preview,
        start=1
    ):
        title = item.get(
            "title",
            "-"
        )

        subtitle = item.get(
            "subtitle",
            ""
        )

        if subtitle:
            lines.append(
                f"{index}. {title} — {subtitle}"
            )
        else:
            lines.append(
                f"{index}. {title}"
            )

    answer = (
        f'Tìm thấy {len(filtered_rows)} kết quả '
        f'phù hợp với "{keyword}".\n\n'
        + "\n".join(lines)
    )

    if len(filtered_rows) > 5:
        answer += (
            f"\n\nCòn "
            f"{len(filtered_rows) - 5} "
            f"kết quả khác."
        )

    return {
        "success": True,
        "type": "SEARCH",
        "answer": answer,
        "data": filtered_rows
    }


# =========================================================
# STATISTICS RESPONSE
# =========================================================

def build_statistics_answer(
    normalized_message: str
):
    overview_result = (
        get_overview_statistics()
    )

    if not overview_result.get(
        "success"
    ):
        return {
            "success": False,
            "type": "STATISTICS",
            "answer": (
                "Không thể đọc dữ liệu thống kê."
            ),
            "message": overview_result.get(
                "message"
            )
        }

    data = overview_result.get(
        "data",
        overview_result
    )

    # -----------------------------------------------------
    # RESIDENTS
    # -----------------------------------------------------

    if any(
        phrase in normalized_message
        for phrase in [
            "bao nhieu cu dan",
            "so cu dan",
            "tong cu dan",
            "cu dan hien tai"
        ]
    ):
        value = data.get(
            "activeResidents",
            0
        )

        return {
            "success": True,
            "type": "STATISTICS",
            "answer": (
                f"Hệ thống hiện có "
                f"{value} cư dân đang hoạt động."
            ),
            "data": {
                "activeResidents": value
            }
        }

    # -----------------------------------------------------
    # APARTMENTS
    # -----------------------------------------------------

    if any(
        phrase in normalized_message
        for phrase in [
            "bao nhieu can ho",
            "so can ho",
            "tong can ho"
        ]
    ):
        value = data.get(
            "totalApartments",
            0
        )

        return {
            "success": True,
            "type": "STATISTICS",
            "answer": (
                f"Hệ thống hiện quản lý "
                f"{value} căn hộ."
            ),
            "data": {
                "totalApartments": value
            }
        }

    # -----------------------------------------------------
    # CONTRACTS
    # -----------------------------------------------------

    if any(
        phrase in normalized_message
        for phrase in [
            "bao nhieu hop dong",
            "so hop dong",
            "hop dong dang hoat dong",
            "hop dong hien tai"
        ]
    ):
        value = data.get(
            "activeContracts",
            0
        )

        return {
            "success": True,
            "type": "STATISTICS",
            "answer": (
                f"Hiện có {value} "
                f"hợp đồng đang hoạt động."
            ),
            "data": {
                "activeContracts": value
            }
        }

    # -----------------------------------------------------
    # VEHICLES
    # -----------------------------------------------------

    if any(
        phrase in normalized_message
        for phrase in [
            "bao nhieu xe",
            "so xe",
            "tong xe",
            "phuong tien"
        ]
    ):
        value = data.get(
            "activeVehicles",
            0
        )

        return {
            "success": True,
            "type": "STATISTICS",
            "answer": (
                f"Hiện có {value} phương tiện "
                f"đang hoạt động trong hệ thống."
            ),
            "data": {
                "activeVehicles": value
            }
        }

    # -----------------------------------------------------
    # INVOICES
    # -----------------------------------------------------

    if any(
        phrase in normalized_message
        for phrase in [
            "bao nhieu hoa don",
            "so hoa don",
            "hoa don thang nay",
            "hoa don hien tai"
        ]
    ):
        count = data.get(
            "currentMonthInvoices",
            0
        )

        billed = data.get(
            "currentMonthBilled",
            0
        )

        return {
            "success": True,
            "type": "STATISTICS",
            "answer": (
                f"Tháng hiện tại đã lập "
                f"{count} hóa đơn, với tổng "
                f"giá trị {format_money(billed)} đồng."
            ),
            "data": {
                "currentMonthInvoices": count,
                "currentMonthBilled": billed
            }
        }

    # -----------------------------------------------------
    # REVENUE / BILLING
    # -----------------------------------------------------

    if any(
        phrase in normalized_message
        for phrase in [
            "doanh thu",
            "tong tien hoa don",
            "tong gia tri hoa don",
            "tien hoa don thang nay"
        ]
    ):
        value = data.get(
            "currentMonthBilled",
            0
        )

        return {
            "success": True,
            "type": "STATISTICS",
            "answer": (
                f"Tổng giá trị hóa đơn đã lập "
                f"trong tháng hiện tại là "
                f"{format_money(value)} đồng.\n\n"
                f"Lưu ý: đây là giá trị hóa đơn "
                f"đã lập, chưa đồng nghĩa với "
                f"số tiền thực tế đã thu."
            ),
            "data": {
                "currentMonthBilled": value
            }
        }

    return None


# =========================================================
# BILLING INSIGHT
# =========================================================

def build_insight_answer(
    normalized_message: str
):
    insight_keywords = [
        "phan tich",
        "nhan xet",
        "xu huong",
        "thong ke hoa don",
        "hoa don tang",
        "hoa don giam"
    ]

    if not any(
        keyword in normalized_message
        for keyword in insight_keywords
    ):
        return None

    result = get_billing_insight()

    if not result.get(
        "success"
    ):
        return None

    data = result.get(
        "data",
        result
    )

    insight = data.get(
        "insight"
    )

    if not insight:
        return None

    return {
        "success": True,
        "type": "INSIGHT",
        "answer": insight,
        "data": data
    }


# =========================================================
# CHAT MAIN FUNCTION
# =========================================================

def chat_with_ai(message: str):
    message = str(
        message or ""
    ).strip()

    if not message:
        return {
            "success": False,
            "answer": (
                "Bạn chưa nhập nội dung câu hỏi."
            )
        }

    normalized = normalize_text(
        message
    )

    # =====================================================
    # 1. GREETING
    # =====================================================

    if normalized in [
        "xin chao",
        "chao",
        "hello",
        "hi",
        "hey"
    ]:
        return {
            "success": True,
            "type": "GREETING",
            "answer": (
                "Xin chào! Tôi là trợ lý AI của "
                "Đức Vũ Tower.\n\n"
                "Tôi có thể hỗ trợ tra cứu cư dân, "
                "căn hộ, phương tiện, hợp đồng, "
                "hóa đơn và phân tích số liệu "
                "trong hệ thống."
            )
        }

    # =====================================================
    # 2. STATISTICS
    # =====================================================

    statistics_answer = (
        build_statistics_answer(
            normalized
        )
    )

    if statistics_answer:
        return statistics_answer

    # =====================================================
    # 3. INSIGHT
    # =====================================================

    insight_answer = (
        build_insight_answer(
            normalized
        )
    )

    if insight_answer:
        return insight_answer

    # =====================================================
    # 4. SEARCH
    # =====================================================

    search_keywords = [
        "tim ",
        "tim kiem",
        "tra cuu",
        "kiem tra",
        "bien so",
        "xe cua",
        "cu dan ten",
        "can ho ",
        "hop dong cua",
        "hoa don cua"
    ]

    if any(
        keyword in normalized
        for keyword in search_keywords
    ):
        return build_search_answer(
            message,
            normalized
        )

    # =====================================================
    # 5. FALLBACK
    # =====================================================

    return {
        "success": True,
        "type": "HELP",
        "answer": (
            "Tôi chưa hiểu chính xác yêu cầu này.\n\n"
            "Bạn có thể hỏi theo các cách như:\n"
            "• Tháng này có bao nhiêu hóa đơn?\n"
            "• Hiện có bao nhiêu cư dân?\n"
            "• Tìm xe của Bảo\n"
            "• Tìm cư dân tên Bảo\n"
            "• Tìm căn hộ C-T3-P3\n"
            "• Tổng giá trị hóa đơn tháng này bao nhiêu?\n"
            "• Phân tích xu hướng hóa đơn"
        )
    }
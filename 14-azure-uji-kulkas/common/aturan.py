"""Aturan uji akhir dan aturan alarm. Satu sumber untuk stasiun uji (simulator), fungsi change feed, dan API.

Semua ambang adalah CONTOH. Ambang asli dari spesifikasi produk klien: [REAL DATA: spesifikasi uji akhir].
"""
from collections import Counter

BATAS = {
    "vakum_target_pa": 100.0,       # tekanan akhir yang harus dicapai
    "vakum_waktu_maks_s": 240,      # dalam waktu ini
    "bocor_maks_g_tahun": 3.0,      # laju bocor refrigeran (detektor halogen)
    "dingin_menit": 10,             # lama uji pendinginan
    "dingin_evap_maks_c": -12.0,    # suhu evaporator setelah dingin_menit
    "arus_min_a": 0.6,
    "arus_maks_a": 1.4,
}
FPY_JENDELA = 20      # jumlah unit terakhir per lini untuk alarm FPY
FPY_MIN_PERSEN = 90.0

ALASAN = {
    "vakum": "Vakum tidak tercapai",
    "bocor": "Bocor melebihi batas",
    "dingin": "Pendinginan kurang",
    "arus": "Arus kompresor di luar batas",
}


def nilai_uji(u: dict) -> list[str]:
    """Kode alasan gagal untuk satu percobaan uji; daftar kosong berarti lulus."""
    b, gagal = BATAS, []
    v = u["vakum"]
    if v["waktu_capai_s"] is None or v["waktu_capai_s"] > b["vakum_waktu_maks_s"]:
        gagal.append("vakum")
    if u["bocor_g_tahun"] > b["bocor_maks_g_tahun"]:
        gagal.append("bocor")
    if u["evap_c"] > b["dingin_evap_maks_c"]:
        gagal.append("dingin")
    if not b["arus_min_a"] <= u["arus_a"] <= b["arus_maks_a"]:
        gagal.append("arus")
    return gagal


def fpy(dokumen: list[dict]) -> float | None:
    """First pass yield (%): unit yang lulus pada percobaan pertama dibagi semua unit percobaan pertama."""
    pertama = [d for d in dokumen if d["percobaan"] == 1]
    if not pertama:
        return None
    return 100.0 * sum(d["hasil"] == "lulus" for d in pertama) / len(pertama)


def alarm_dari(dok: dict, riwayat_lini: list[dict]) -> list[dict]:
    """Logika fungsi change feed: alarm yang dipicu satu dokumen uji baru.

    riwayat_lini = dokumen percobaan pertama terbaru di lini yang sama (termasuk dok bila percobaan 1).
    """
    out = []
    if dok["hasil"] == "gagal" and dok["percobaan"] >= 2:
        out.append({
            "id": f"ulang-{dok['unit']}", "lini": dok["lini"], "jenis": "gagal_berulang", "tingkat": "kritis",
            "unit": dok["unit"], "waktu": dok["waktu"],
            "pesan": f"{dok['unit']} gagal lagi pada percobaan ke-{dok['percobaan']}. Tarik dari lini untuk analisis.",
        })
    terakhir = riwayat_lini[:FPY_JENDELA]
    nilai = fpy(terakhir)
    if dok["percobaan"] == 1 and len(terakhir) >= FPY_JENDELA and nilai is not None and nilai < FPY_MIN_PERSEN:
        alasan = Counter(a for d in terakhir for a in d["alasan"]).most_common(1)
        utama = ALASAN[alasan[0][0]].lower() if alasan else "beragam"
        out.append({
            # satu alarm FPY per lini per jam, supaya tidak membanjir
            "id": f"fpy-{dok['lini']}-{dok['waktu'][:13]}", "lini": dok["lini"], "jenis": "fpy_rendah", "tingkat": "peringatan",
            "unit": dok["unit"], "waktu": dok["waktu"],
            "pesan": f"FPY {nilai:.0f} % pada {FPY_JENDELA} unit terakhir, di bawah {FPY_MIN_PERSEN:.0f} %. Penyebab terbanyak: {utama}.",
        })
    return out

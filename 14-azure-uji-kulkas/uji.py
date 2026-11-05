"""Uji mandiri aturan uji akhir dan alarm (tanpa Cosmos DB). Jalankan: python uji.py"""
from common.aturan import alarm_dari, fpy, nilai_uji


def uji(**ubah):
    u = {"vakum": {"waktu_capai_s": 200}, "bocor_g_tahun": 1.0, "evap_c": -15.0, "arus_a": 1.0}
    for k, v in ubah.items():
        if k == "capai":
            u["vakum"]["waktu_capai_s"] = v
        else:
            u[k] = v
    return nilai_uji(u)


assert uji() == []
assert uji(capai=None) == ["vakum"] and uji(capai=241) == ["vakum"] and uji(capai=240) == []
assert uji(bocor_g_tahun=3.01) == ["bocor"] and uji(evap_c=-11.9) == ["dingin"]
assert uji(arus_a=0.59) == ["arus"] and uji(arus_a=1.41) == ["arus"] and uji(arus_a=1.4) == []

d = lambda h, p=1, al=(): {"unit": "U", "lini": "L2", "hasil": h, "percobaan": p, "alasan": list(al), "waktu": "2026-11-05T07:10:00Z"}
assert fpy([d("lulus"), d("gagal"), d("gagal", 2)]) == 50.0 and fpy([]) is None
# gagal di percobaan kedua → alarm kritis
assert [a["jenis"] for a in alarm_dari(d("gagal", 2), [])] == ["gagal_berulang"]
# FPY 85 % pada 20 unit → alarm peringatan; 19 unit belum cukup
riw = [d("gagal", al=["vakum"])] * 3 + [d("lulus")] * 17
a = alarm_dari(riw[0], riw)
assert [x["jenis"] for x in a] == ["fpy_rendah"] and "vakum tidak tercapai" in a[0]["pesan"], a
assert alarm_dari(riw[0], riw[:19]) == []
assert alarm_dari(d("lulus"), [d("lulus")] * 20) == []
print("uji lulus")

// Task downsampling: rata-rata 1 menit dari bucket mentah (retensi 7 hari) ke oven_1m (retensi 400 hari).
option task = {name: "downsample_oven_1m", every: 1m, offset: 15s}

from(bucket: "oven_raw")
    |> range(start: -task.every)
    |> filter(fn: (r) => r._measurement == "zone" or r._measurement == "oven")
    |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
    |> to(bucket: "oven_1m")

# Sensitivity check: concurrency of the lifecycle service's requests to Ditto (E2)

Before the E2 campaign, the DT-mediated condition with 1000 emulated gateways and the calibrated
profile ran on a freshly restarted, warmed-up platform (warm-up rep 0, measured rep 1), once with the
lifecycle service limited to 32 concurrent requests to Ditto (`http32/`) and once with 128
(`http128/`), set through `SW_HTTP_CONCURRENCY`. The files are described in ../../README.md.

| measured rep | 32 | 128 |
|---|---|---|
| fleet time | 39.8 s | 43.9 s |
| device latency p50 / p95 | 10.8 s / 13.8 s | 3.0 s / 3.7 s |
| Ditto PATCH latency p50 / p95 | 299 / 539 ms | 458 / 821 ms |
| status writes queued in the lifecycle service p50 / p95 | 3324 / 8373 ms | 1 / 385 ms |
| CPU in % of one core: gateway, things, things-search | 227, 169, 111 | 239, 178, 102 |

With 32, status writes queued inside the lifecycle service. With 128 that queue vanished and the
waiting moved into Ditto, whose gateway was CPU-saturated in both runs, so the fleet time stayed about
the same while the device latency fell. The campaigns use 128. One measured repetition per setting.

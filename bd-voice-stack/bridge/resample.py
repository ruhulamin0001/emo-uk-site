import numpy as np
from scipy.signal import resample_poly

def resample(b: bytes, src: int, dst: int) -> bytes:
    if src == dst or not b:
        return b
    x = np.frombuffer(b, dtype=np.int16).astype(np.float32)
    g = np.gcd(src, dst)
    y = resample_poly(x, dst // g, src // g)
    return np.clip(y, -32768, 32767).astype(np.int16).tobytes()

import numpy as np
from bridge.resample import resample

def test_8k_to_24k_length():
    x = (np.sin(np.linspace(0, 100, 800)) * 10000).astype(np.int16).tobytes()
    y = resample(x, 8000, 24000)
    assert abs(len(y) - 800 * 2 * 3) < 64

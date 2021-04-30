class CRC {
	constructor(s) {
        this.sr;
        this.bmask = 0x10000;	// 1 << 16
        this.poly = 0x1020;	// (1 << 5) | (1 << 12)
		this.Reset();
		if (s) {
			this.AddString(s);
		}
	}

	Reset() {
		this.sr = ~0;
	}

	AddByte(b) {
        var i = 0;
		for (i = 0; i < 8; i++) {
			this.sr <<= 1;
			if (this.sr & this.bmask) this.sr |= 1;

			if (b & (1 << (7-i))) this.sr ^= 1;

			if (this.sr & 1) this.sr ^= this.poly;
		}
	}

	AddString(s) {
        var i,j = 0;
		for (i=0, j=s.length; i < j; i++) {
			this.AddByte(s.charCodeAt(i));
		}
	}

	Get() {
		return (~this.sr & (this.bmask - 1));
	}
}
module.exports = CRC;

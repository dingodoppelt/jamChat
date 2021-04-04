<?php
$sock = socket_create(AF_INET, SOCK_DGRAM, SOL_UDP);
class CRC {
	var $sr;
	var $bmask = 0x10000;	// 1 << 16
	var $poly = 0x1020;	// (1 << 5) | (1 << 12)

	function CRC($s = null) {
		$this->Reset();
		if (isset($s)) {
			$this->AddString($s);
		}
	}

	function Reset() {
		$this->sr = ~0;
	}

	function AddByte($b) {
		for ($i = 0; $i < 8; $i++) {
			$this->sr <<= 1;
			if ($this->sr & $this->bmask) $this->sr |= 1;

			if ($b & (1 << (7-$i))) $this->sr ^= 1;

			if ($this->sr & 1) $this->sr ^= $this->poly;
		}
	}

	function AddString($s) {
		for ($i=0, $j=strlen($s); $i < $j; $i++) {
			$this->AddByte(ord($s[$i]));
		}
	}

	function Get() {
		return (~$this->sr & ($this->bmask - 1));
	}
}

//-----------------------------------------------------------------------------
// send an external chat message
//-----------------------------------------------------------------------------
function send_extchat($sock, $ip, $port, $listener, $message) {
    $message = '<b>***Message from listener '.$listener.':</b> '.$message;
    $id = 1019;
	$data = pack('vvC', 0, $id, 0);
	$data .= pack('vva*', strlen($message) + 2, strlen($message), $message);

	// need to calculate CRC
	$crc = new CRC($data);
	$data .= pack('v', $crc->Get());
	unset($crc);

	//print chunk_split(bin2hex($data),2,' ')."\n";

	$n = socket_sendto($sock, $data, strlen($data), 0, $ip, $port);

	if ($n === false) {
		die("Send error: ".socket_strerror(socket_last_error()));
	}
}

send_extchat($sock, '127.0.0.1', 22124, $argv[1], $argv[2]);
socket_close($sock);
?>

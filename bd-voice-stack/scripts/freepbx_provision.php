<?php
/**
 * FreePBX 17 provisioning through the same PHP API the GUI uses.
 *
 *   php freepbx_provision.php trunks  <trunks.csv>
 *   php freepbx_provision.php routing <trunks.csv> <extensions.csv>
 *
 * Run as root on the PBX, then `fwconsole reload`. Idempotent: existing objects with the same
 * name / number are deleted and recreated.
 *
 * Why not raw SQL: FreePBX table columns change between module versions. The API below has been
 * stable for years. Every call is guarded, so a missing function prints exactly what to do in the
 * GUI instead of leaving a half applied config.
 */
$bootstrap_settings['freepbx_auth'] = false;
if (!@include_once('/etc/freepbx.conf')) {
    fwrite(STDERR, "/etc/freepbx.conf not found. Is FreePBX installed?\n");
    exit(2);
}

function readCsv(string $path): array {
    $fh = fopen($path, 'r');
    if (!$fh) { fwrite(STDERR, "cannot open $path\n"); exit(2); }
    $head = fgetcsv($fh);
    $rows = [];
    while (($r = fgetcsv($fh)) !== false) {
        if (count($r) === 1 && trim($r[0]) === '') continue;
        $rows[] = array_combine($head, $r);
    }
    fclose($fh);
    return $rows;
}

function say(string $s): void { echo $s, "\n"; }

function need(string $fn, string $gui): void {
    if (!function_exists($fn)) {
        fwrite(STDERR, "FreePBX function $fn is missing in this version. Do it in the GUI over VPN: $gui\n");
        exit(3);
    }
}

$core = FreePBX::Core();
$db   = FreePBX::Database();

function trunkIdByName(string $name): ?int {
    foreach (FreePBX::Core()->listTrunks() as $t) {
        if (($t['name'] ?? '') === $name) return (int)$t['trunkid'];
    }
    return null;
}

/* ------------------------------------------------------------------ trunks */
function doTrunks(string $csv): void {
    $rows = readCsv($csv);
    foreach ($rows as $r) {
        $name = $r['name'];
        if (($id = trunkIdByName($name)) !== null) {
            FreePBX::Core()->deleteTrunk($id, 'pjsip');
            say("trunk $name: removed old id $id");
        }
        // Keys are the pjsip trunk form fields (Connectivity > Trunks > pjsip). Unknown keys are ignored.
        $settings = [
            'channelid'         => $name,
            'trunk_name'        => $name,
            'outcid'            => $r['number'],
            'keepcid'           => 'off',          // Allow Any CID: extension / route CID wins when set
            'maxchans'          => $r['channels'],
            'dialoutprefix'     => '',
            'failtrunk'         => '',
            'disabletrunk'      => 'off',
            'continue'          => 'off',
            'sip_server'        => $r['host'],
            'sip_server_port'   => $r['port'],
            'username'          => $r['username'],
            'secret'            => $r['secret'],
            'authentication'    => 'outbound',
            'registration'      => strtolower($r['register']) === 'yes' ? 'send' : 'none',
            'context'           => 'from-pstn',
            'codecs'            => str_replace('&', ',', $r['codecs']),
            'from_domain'       => $r['host'],
            'from_user'         => $r['username'],
            'match_permit'      => '',
            'transport'         => '0.0.0.0-udp',
            'qualify_frequency' => '60',
            'aor_contact'       => '',
            'outbound_proxy'    => '',
        ];
        FreePBX::Core()->addTrunk($name, 'pjsip', $settings);
        $id = trunkIdByName($name);
        say("trunk $name ({$r['number']}) -> id " . ($id ?? '?'));
    }
    say("trunks done: " . count($rows));
}

/* ----------------------------------------------------------------- routing */
function doRouting(string $trunkCsv, string $extCsv): void {
    $trunks = readCsv($trunkCsv);
    $exts   = readCsv($extCsv);
    $bizs   = [];
    foreach ($trunks as $t) $bizs[$t['biz']][] = $t;
    ksort($bizs);
    $extsByBiz = [];
    foreach ($exts as $e) $extsByBiz[$e['biz']][] = $e['extension'];

    // 1. ring groups 601..605
    $rg = FreePBX::Ringgroups();
    $n = 0;
    foreach (array_keys($bizs) as $biz) {
        $n++;
        $grp = (string)(600 + $n);
        $members = implode('-', $extsByBiz[$biz] ?? []);
        FreePBX::Database()->query("DELETE FROM ringgroups WHERE grpnum = " . FreePBX::Database()->quote($grp));
        $rg->add($grp, 'ringall', '25', $members, 'app-blackhole,hangup,1', "$biz humans", '', '0', '', '', '', '', 'Ring', '0', '0', 'default', '', '', 'dontcare', 'yes', '', '');
        say("ring group $grp ($biz) members=$members");
    }

    // 2. inbound routes: every DID -> ai-agent,bizN,1  (direct dialplan target, no Custom Destination row needed)
    need('core_did_add', 'Connectivity > Inbound Routes, DID = number, Destination = Custom Destinations > AI Agent bizN');
    foreach ($trunks as $t) {
        $did = $t['number'];
        if (function_exists('core_did_del')) core_did_del($did, '');
        else FreePBX::Database()->query("DELETE FROM incoming WHERE extension = " . FreePBX::Database()->quote($did) . " AND cidnum = ''");
        core_did_add([
            'extension' => $did, 'cidnum' => '', 'destination' => "ai-agent,{$t['biz']},1",
            'description' => "{$t['biz']} $did", 'privacyman' => '0', 'alertinfo' => '', 'ringing' => '',
            'mohclass' => 'default', 'grppre' => '', 'delay_answer' => '0', 'pricid' => '', 'pmmaxretries' => '',
            'pmminlength' => '', 'reversal' => '', 'rvolume' => '', 'fanswer' => '', 'indication_zone' => 'default',
        ]);
        say("inbound $did -> ai-agent,{$t['biz']},1");
    }

    // 3. outbound routes, one per business. Dial patterns carry the CallerID field (match_cid) set to
    //    each extension of that business, so extension 101 can only leave through biz1's trunks and
    //    shows biz1's number. Bangladesh numbers only. No 00 / + prefix, so ISD is impossible.
    need('core_routing_addbyid', 'Connectivity > Outbound Routes: one route per business, patterns 01XXXXXXXXX etc. with CallerID = extension, trunks = that business only');
    $patterns = ['01XXXXXXXXX', '02XXXXXXXX', '0[3-9]XXXXXXXX', '880XXXXXXXXXX'];
    foreach ($bizs as $biz => $bizTrunks) {
        $name = "{$biz}_bd";
        $st = FreePBX::Database()->prepare("SELECT route_id FROM outbound_routes WHERE name = ?");
        $st->execute([$name]);
        foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $old) {
            if (function_exists('core_routing_delbyid')) core_routing_delbyid($old);
        }
        $pat = [];
        foreach ($extsByBiz[$biz] ?? [] as $ext) {
            foreach ($patterns as $p) {
                $pat[] = ['match_pattern_prefix' => '', 'match_pattern_pass' => $p, 'match_cid' => $ext, 'prepend_digits' => ''];
            }
        }
        if (!$pat) { say("outbound $name: no extensions for $biz in extensions.csv, skipped"); continue; }
        $trunkIds = [];
        foreach ($bizTrunks as $t) {
            $id = trunkIdByName($t['name']);
            if ($id === null) { fwrite(STDERR, "trunk {$t['name']} not found, run 04_trunks.sh first\n"); exit(3); }
            $trunkIds[] = $id;
        }
        $routeId = core_routing_addbyid($name, $pat, $trunkIds, 'new', '', '', '', '', '', '', $bizTrunks[0]['number'], '');
        say("outbound $name route_id=$routeId trunks=" . implode(',', $trunkIds) . " exts=" . implode(',', $extsByBiz[$biz]));
    }
    needreload();
    say("routing done");
}

$mode = $argv[1] ?? '';
if ($mode === 'trunks' && isset($argv[2]))            doTrunks($argv[2]);
elseif ($mode === 'routing' && isset($argv[3]))       doRouting($argv[2], $argv[3]);
else { fwrite(STDERR, "usage: trunks <trunks.csv> | routing <trunks.csv> <extensions.csv>\n"); exit(1); }

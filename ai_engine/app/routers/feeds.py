from fastapi import APIRouter

router = APIRouter()

@router.get("/threats")
def get_threats_feed():
    return {
        "active_cves": [
            {"id": "CVE-2026-3841", "severity": "CRITICAL", "score": 9.8, "summary": "Remote Code Execution in core transport serialization engine.", "affected": "Linux Kernel 6.8+"},
            {"id": "CVE-2026-1025", "severity": "HIGH", "score": 8.4, "summary": "Privilege Escalation via session timing races in containerized routers.", "affected": "Docker Engine < 25.0.3"},
            {"id": "CVE-2026-9041", "severity": "MEDIUM", "score": 6.5, "summary": "Directory Traversal vulnerability in node asset path resolve logic.", "affected": "Node.js v20.x, v21.x"}
        ],
        "mitre_attack_tactics": [
            {"tactic": "TA0001", "name": "Initial Access", "techniques": ["T1566 (Phishing)", "T1190 (Exploit Public-Facing Application)"]},
            {"tactic": "TA0002", "name": "Execution", "techniques": ["T1059 (Command and Scripting Interpreter)", "T1204 (User Execution)"]},
            {"tactic": "TA0005", "name": "Defense Evasion", "techniques": ["T1027 (Obfuscated Files or Information)", "T1070 (Indicator Removal)"]},
            {"tactic": "TA0040", "name": "Impact", "techniques": ["T1486 (Data Encrypted for Impact)", "T1490 (Inhibit System Recovery)"]}
        ],
        "yara_rules_active": [
            {"rule_name": "RANSOMWARE_Wannacry_Indicators", "type": "Static Signature", "status": "ACTIVE"},
            {"rule_name": "TROJAN_Powershell_Bypass_Obfuscation", "type": "Heuristic Code Pattern", "status": "ACTIVE"},
            {"rule_name": "PHISHING_Credential_Harvest_Form", "type": "HTML Text Regex", "status": "ACTIVE"}
        ],
        "abuse_ip_database_matches": [
            {"ip": "185.220.101.4", "category": "Tor Exit Node", "confidence": 100},
            {"ip": "45.143.203.12", "category": "SSH Brute Forcer", "confidence": 92},
            {"ip": "103.241.12.85", "category": "Credential Stuffing Source", "confidence": 85}
        ]
    }

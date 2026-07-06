class AICopilotService:
    def __init__(self):
        pass

    def answer_query(self, query: str, context: dict = None) -> dict:
        q = query.lower()
        response = ""
        action_plan = []
        mitre_tactics = []

        if "malware" in q or "ransomware" in q or "threat" in q:
            response = (
                "Regarding the detected threat vectors: Our scanner uses signature heuristic checks, "
                "entropy metrics, and YARA integration. If ransomware is flagged (e.g. key deletion command, "
                "mass renaming, high file entropy), the system locks down the file CID on-chain, blocks the client IP, "
                "and preserves the payload signature for forensic analysis. Suggested remediation: Check host process logs "
                "for vssadmin commands and trigger local antivirus containment."
            )
            mitre_tactics = ["T1486 (Data Encrypted for Impact)", "T1059 (Execution)"]
            action_plan = [
                "Contain network endpoint interface",
                "Perform full system image forensic backup",
                "Verify hash integrity on the FileRegistry smart contract",
                "Rotate user RSA private keys"
            ]

        elif "blockchain" in q or "contract" in q or "ledger" in q:
            response = (
                "The decentralized ledger utilizes the FileRegistry Solidity smart contract to store file hashes, "
                "CIDs, ownership logs, and ABAC access policies. By recording cryptographic verification events "
                "on-chain, we construct an immutable chain of custody. This deters insider manipulation and "
                "prevents log alteration or deletion, addressing critical requirements for compliance frameworks."
            )
            mitre_tactics = ["T1565.001 (Data Manipulation: Stored Data)"]
            action_plan = [
                "Audit local network smart contract events",
                "Verify Gas consumption limits",
                "Review multi-signature validation parameters"
            ]

        elif "compliance" in q or "iso" in q or "gdpr" in q or "nist" in q:
            response = (
                "Compliance analysis shows the platform aligns with:\n"
                "- GDPR Article 32 (Technical measures for data confidentiality via client-side AES-256 + RSA-4096 wrapping)\n"
                "- ISO 27001 Control A.8 (Asset management & Cryptography logs recorded on-chain)\n"
                "- NIST CSF PR.AC-1 (Zero Trust adaptive verification checking location/risk score before file access)"
            )
            action_plan = [
                "Generate PDF compliance audit log export",
                "Run periodic vulnerability scan of API endpoints",
                "Enforce multi-factor authorization (TOTP) for all Admins"
            ]

        elif "forensic" in q or "evidence" in q or "chain of custody" in q:
            response = (
                "Digital Forensics mode allows SOC analysts to rebuild incident chains of custody. Each upload hash "
                "is signed with the user's ECDSA signature and matched against the on-chain registry. Any alteration in "
                "IPFS payload hashes triggers a hash verification alert during file retrieve. We export RFC 3161 compliant "
                "hashes for courtroom-ready forensic evidence."
            )
            mitre_tactics = ["T1070 (Indicator Removal on Host - Evasion check)"]
            action_plan = [
                "Extract original file metadata JSON structure",
                "Compare IPFS CID state with registered blockchain values",
                "Check system logs for impossible travel triggers"
            ]

        else:
            response = (
                "Hello, I am your Security Engine Assistant. I can help analyze suspicious uploads, explain "
                "behavioral biometrics anomalies, detail our Zero Trust policies, or mapping incidents to "
                "MITRE ATT&CK tactics. Please let me know how I can assist you with your SOC analysis."
            )
            action_plan = ["Analyze system logs", "View threat intelligence feed"]

        # Parse context parameters for rich response
        if context and "threat_score" in context:
            score = context.get("threat_score")
            response = (
                f"Incident Analysis Alert: A file upload request scored a Threat Rating of {score}/100. "
                f"Flagged elements: {', '.join(context.get('detected_threats', []))}. " + response
            )

        return {
            "response": response,
            "mitre_tactics": mitre_tactics,
            "suggested_action_plan": action_plan,
            "cyber_copilot_verdict": "ANALYSIS_COMPLETE"
        }

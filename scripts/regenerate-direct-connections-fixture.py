"""Regenerate scripts/fixtures/direct-connections.sample.json from the canonical
API modules -- no database needed.

The fixture used to be captured from the live API, which made it stale the very
next time a directory row changed and required a running Postgres. Every payload
here is a pure function of the API's own data and derivation, so it can be
rebuilt from the source of truth directly. Run with PYTHONPATH pointing at the
API repo:

    PYTHONPATH=/path/to/konduyt-api python3 scripts/regenerate-direct-connections-fixture.py
"""
import json
import os
from datetime import date

from app.direct_connections import directory as D
from app.direct_connections import institutions as I
from app.direct_connections import models as M

CODES = ["KE", "NG", "IN", "BR", "US", "DE", "JP", "AU", "XK", "VA", "TW"]
SEARCHES = {"equity": "Equity Bank", "mpesa": "M-Pesa",
            "tkash": "T-Kash", "hdfc": "HDFC Bank"}


def institutions_payload(code, category=None):
    insts = [i for i in I.all_institutions() if i["country_code"] == code]
    if category:
        insts = [i for i in insts if i["category"] == category]
    insts.sort(key=lambda i: (i["category"], i["name"]))
    rows = []
    for i in insts:
        rows.append({
            **i,
            "state": (M.EXECUTABLE
                      if i["execution_capability"] == M.EXECUTION_EXECUTABLE
                      else M.NOT_SUPPORTED),
            "rail_confirmation_mechanism": i["confirmation_mechanism"],
            "effective_confirmation_mode": (
                M.mode_for_mechanism(i["confirmation_mechanism"])
                if i["execution_capability"] == M.EXECUTION_EXECUTABLE
                else M.MANUAL_MODE),
        })
    return {
        "country": code,
        "institutions": rows,
        "summary": {
            "total": len(rows),
            "executable": sum(1 for r in rows
                              if r["execution_capability"] == M.EXECUTION_EXECUTABLE),
            "not_supported": sum(1 for r in rows
                                 if r["execution_capability"] == M.EXECUTION_NOT_SUPPORTED),
        },
        "note": ("An institution existing is not a connection being executable. "
                 "Only EXECUTABLE institutions can carry a live payment request."),
    }


def country_payload(code):
    d = D.country_directory(code)
    insts = [i for i in I.all_institutions() if i["country_code"] == code]
    d["execution"] = {
        "listed": len(insts),
        "executable": sum(1 for i in insts
                          if i["execution_capability"] == M.EXECUTION_EXECUTABLE),
        "note": ("Executable count is derived from the connector registry. "
                 "Listing is not capability."),
    }
    return d


def main():
    dirs = D.all_country_directories()
    fixture = {}
    for code in CODES:
        fixture[f"countries_{code}"] = country_payload(code)
    for key, q in SEARCHES.items():
        fixture[f"search_{key}"] = D.search(q)
    fixture["institutions_KE"] = institutions_payload("KE")
    fixture["countries"] = {
        "countries": [
            {"code": d["code"], "name": d["name"], "region": d["region"],
             "subregion": d["subregion"], "currency": d["currency"],
             "discovery_state": d["discovery_state"]}
            for d in dirs
        ],
        "total": len(dirs),
        "discovered": sum(1 for d in dirs if d["discovery_state"] == D.STATE_DISCOVERED),
        "note": ("A country being listed, or having banks listed, is not a "
                 "statement that Konduyt can execute a payment there."),
    }
    fixture["_source"] = (
        "Regenerated from the canonical konduyt-api modules on "
        f"{date.today().isoformat()} by scripts/regenerate-direct-connections-fixture.py: "
        "/countries, " + f"/countries/{{{','.join(CODES)}}}, "
        "/institutions?country=KE, and the four searches. Every payload is a pure "
        "function of app/direct_connections, so the fixture no longer needs a live "
        "API or a database. Regenerate whenever the payload shape or directory data "
        "changes.")
    out = os.path.join(os.path.dirname(__file__), "fixtures",
                       "direct-connections.sample.json")
    with open(out, "w") as f:
        json.dump(fixture, f, indent=1, sort_keys=True)
        f.write("\n")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()

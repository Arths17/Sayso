from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse

from app.connectors.base import ConnectorError

_ALLOWED_SCHEMES = {"http", "https"}


def assert_public_url(url: str) -> None:
    """Raise ConnectorError if `url` isn't a plain http(s) URL resolving to a
    public address. Resolves the hostname (not just string-matching it) so
    DNS rebinding to a private/metadata IP is caught too."""
    parsed = urlparse(url)
    if parsed.scheme not in _ALLOWED_SCHEMES:
        raise ConnectorError(f"unsupported URL scheme '{parsed.scheme}'")
    if not parsed.hostname:
        raise ConnectorError("URL has no hostname")

    try:
        addrs = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror as e:
        raise ConnectorError(f"could not resolve host '{parsed.hostname}': {e}") from e

    for family, _, _, _, sockaddr in addrs:
        ip = ipaddress.ip_address(sockaddr[0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise ConnectorError(
                f"URL host '{parsed.hostname}' resolves to a private/internal "
                f"address ({ip}); blocked to prevent SSRF"
            )

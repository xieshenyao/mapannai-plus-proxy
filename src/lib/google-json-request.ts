import axios from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'

function getProxyEnv(protocol: 'http:' | 'https:'): string | undefined {
    if (protocol === 'https:') {
        return process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy
    }

    return process.env.HTTP_PROXY || process.env.http_proxy
}

function isNoProxyHost(hostname: string): boolean {
    const noProxy = process.env.NO_PROXY || process.env.no_proxy
    if (!noProxy) {
        return false
    }

    return noProxy
        .split(',')
        .map(entry => entry.trim())
        .filter(Boolean)
        .some(entry => hostname === entry || hostname.endsWith(`.${entry}`))
}

function resolveProxyAgent(targetUrl: string) {
    const parsedUrl = new URL(targetUrl)
    if (isNoProxyHost(parsedUrl.hostname)) {
        return false
    }

    const proxyUrl = getProxyEnv(parsedUrl.protocol as 'http:' | 'https:')
    if (!proxyUrl) {
        return false
    }

    const parsedProxyUrl = new URL(proxyUrl)

    if (parsedProxyUrl.protocol.startsWith('socks')) {
        return new SocksProxyAgent(proxyUrl)
    }

    return new HttpsProxyAgent(proxyUrl)
}

export async function getJsonWithProxy<T>(url: string): Promise<{ status: number; data: T }> {
    const proxyAgent = resolveProxyAgent(url)
    const response = await axios.get<T>(url, {
        timeout: 20000,
        proxy: false,
        httpAgent: proxyAgent || undefined,
        httpsAgent: proxyAgent || undefined,
        validateStatus: () => true,
    })

    return {
        status: response.status,
        data: response.data,
    }
}

export default {
    getJsonWithProxy,
}
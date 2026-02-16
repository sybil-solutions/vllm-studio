// CRITICAL
import type { ServiceInfo } from "@/lib/types";
import { getStatusBg, getStatusColor } from "@/lib/colors";

export function ServiceTopology({ services }: { services: ServiceInfo[] }) {
  return (
    <div>
      <div className="text-xs text-(--dim) uppercase tracking-wider mb-3">Service Topology</div>
      <div className="sm:hidden space-y-2">
        {services.map((service) => (
          <ServiceCard key={service.name} service={service} />
        ))}
      </div>
      <div className="hidden sm:block bg-(--surface) rounded-lg overflow-hidden">
        <ServiceTable services={services} />
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: ServiceInfo }) {
  return (
    <div className="bg-(--surface) rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusBg(service.status)}`} />
          <span className="text-(--fg) font-medium">{service.name}</span>
        </div>
        <span className={`text-xs ${getStatusColor(service.status)}`}>{service.status}</span>
      </div>
      <div className="space-y-1 text-xs text-(--dim)">
        <div className="flex justify-between">
          <span>Port</span>
          <span className="text-(--fg)">{service.port}</span>
        </div>
        {service.port !== service.internal_port && (
          <div className="flex justify-between">
            <span>Internal</span>
            <span className="text-(--fg)">{service.internal_port}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Protocol</span>
          <span className="text-(--fg) uppercase">{service.protocol}</span>
        </div>
        {service.description && <div className="pt-1 text-(--dim)/70">{service.description}</div>}
      </div>
    </div>
  );
}

function ServiceTable({ services }: { services: ServiceInfo[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-(--dim) text-xs border-b border-(--border)">
          <th className="text-left py-3 px-4 font-normal">Service</th>
          <th className="text-left py-3 px-4 font-normal">Port</th>
          <th className="text-left py-3 px-4 font-normal">Protocol</th>
          <th className="text-left py-3 px-4 font-normal">Status</th>
        </tr>
      </thead>
      <tbody>
        {services.map((service, index) => (
          <tr key={service.name} className={index > 0 ? "border-t border-(--border)/50" : ""}>
            <td className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${getStatusBg(service.status)}`} />
                <div>
                  <div className="text-(--fg)">{service.name}</div>
                  {service.description && (
                    <div className="text-[10px] text-(--dim)">{service.description}</div>
                  )}
                </div>
              </div>
            </td>
            <td className="py-3 px-4 text-(--fg)">
              {service.port}
              {service.port !== service.internal_port && (
                <span className="text-(--dim) text-xs ml-1">→ {service.internal_port}</span>
              )}
            </td>
            <td className="py-3 px-4">
              <span className="px-2 py-0.5 rounded bg-(--border) text-(--fg) text-xs uppercase">
                {service.protocol}
              </span>
            </td>
            <td className="py-3 px-4">
              <span className={`text-sm ${getStatusColor(service.status)}`}>{service.status}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


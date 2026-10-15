import { McpConnectionScopeEnum } from '@novu/shared';
import { expect } from 'chai';

import { AgentMcpDefinitionService } from './agent-mcp-definition.service';

function makeService(): AgentMcpDefinitionService {
  const logger = {
    setContext: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  return new AgentMcpDefinitionService({} as never, {} as never, {} as never, logger as never);
}

describe('AgentMcpDefinitionService keyless projection', () => {
  it('projects keyless MCPs onto the shared agent regardless of scope', () => {
    const service = makeService();

    const projected = service
      .project(
        [
          { mcpId: 'parallel-search', defaultScope: McpConnectionScopeEnum.Subscriber },
          { mcpId: 'linear', defaultScope: McpConnectionScopeEnum.Subscriber },
        ] as never,
        { agentId: 'agent_1', caller: 'test' }
      )
      .map((entry) => entry.externalId);

    expect(projected).to.deep.equal(['parallel-search']);
  });

  it('keeps existing scope rules for OAuth MCPs', () => {
    const service = makeService();

    const projected = service
      .project(
        [
          { mcpId: 'linear', defaultScope: McpConnectionScopeEnum.Agent },
          { mcpId: 'linear', defaultScope: McpConnectionScopeEnum.Subscriber },
        ] as never,
        { agentId: 'agent_1', caller: 'test' }
      )
      .map((entry) => entry.externalId);

    expect(projected).to.deep.equal(['linear']);
  });

  it('keeps parallel-search in the provision filter', () => {
    const service = makeService();

    expect(
      service.filterIdsForProvision(['parallel-search', 'linear'], McpConnectionScopeEnum.Subscriber)
    ).to.deep.equal(['parallel-search']);
  });
});

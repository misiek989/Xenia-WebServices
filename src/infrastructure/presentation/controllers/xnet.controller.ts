import { ConsoleLogger, Controller, Get } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Delete, Param, Query } from '@nestjs/common/decorators';
import IpAddress from 'src/domain/value-objects/IpAddress';
import MacAddress from 'src/domain/value-objects/MacAddress';
import { DeleteSessionsCommand } from 'src/application/commands/DeleteSessionCommand';
import { RealIP } from 'nestjs-real-ip';
import { ProcessClientAddressCommand } from 'src/application/commands/ProcessClientAddressCommand';

@ApiTags('XNet')
@Controller()
export class XNetController {
  constructor(
    private readonly logger: ConsoleLogger,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {
    this.logger.setContext(XNetController.name);
  }

  @Get('/whoami')
  async getClientAddress(@RealIP() ip: string) {
    const ipv4 = await this.commandBus.execute(
      new ProcessClientAddressCommand(ip),
    );

    return { address: ipv4 };
  }

  @Delete(['/DeleteSessions/:macAddress', '/DeleteSessions'])
  @ApiQuery({ name: 'hostAddress', description: 'IP Address', required: false })
  @ApiParam({ name: 'macAddress', description: 'Mac Address', required: false })
  async deleteAllSessions(
    @RealIP() ip: string,
    @Query('hostAddress') hostAddress?: string,
    @Param('macAddress') macAddress?: string,
  ) {
    let ipv4 = hostAddress ? hostAddress : ip;

    ipv4 = await this.commandBus.execute(new ProcessClientAddressCommand(ipv4));

    let mac = null;

    try {
      mac = new MacAddress(macAddress);
    } catch (err: unknown) {
      this.logger.debug('Deleting session(s) based on IP!');
    }

    await this.commandBus.execute(
      new DeleteSessionsCommand(new IpAddress(ipv4), mac),
    );
  }
}

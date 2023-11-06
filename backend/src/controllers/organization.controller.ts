import { Controller, Get, Body, UseBefore, Req, Post, Patch, Delete, Param } from 'routing-controllers';
import ApiService from '@/services/api.service';
import { OpenAPI } from 'routing-controllers-openapi';
import authMiddleware from '@/middlewares/auth.middleware';
import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { IsNumber, IsOptional, IsString } from 'class-validator';

interface ResponseData<T> {
  data: T;
  message: string;
  status: number;
}

@Controller()
export class OrganizationController {
  private apiService = new ApiService();

  @Get('/organization')
  @OpenAPI({ summary: 'Get orgName by treeLevel and companyId' })
  @UseBefore(authMiddleware)
  async getCompanies(@Req() req: any): Promise<any> {
    try {
      const url = `/metaadmin/1.0/organization?treeLevel=2&companyId=71`;
      const res = await this.apiService.get<{ status: string }>({ url });
      return { data: res.data, message: 'success', status: 200 };
    } catch (error) {
      throw new HttpException(500, error.message);
    }
  }
}

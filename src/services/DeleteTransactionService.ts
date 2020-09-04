import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const transation = await transactionsRepository.findOne(id);

    if (!transation) {
      throw new AppError('Transation not found');
    }

    await transactionsRepository.delete(transation.id);
  }
}

export default DeleteTransactionService;

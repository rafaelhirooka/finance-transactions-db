import { getCustomRepository, getRepository } from 'typeorm';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category: CategoryName,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    if (type === 'outcome') {
      const { total } = await transactionsRepository.getBalance();
      if (total - value <= 0) {
        throw new AppError('Seu pobre');
      }
    }

    let category = await getRepository(Category).findOne({
      where: {
        title: CategoryName,
      },
    });

    if (!category) {
      const newCategory = getRepository(Category).create({
        title: CategoryName,
      });
      await getRepository(Category).save(newCategory);

      category = newCategory;
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: category.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;

import fs from 'fs';
import path from 'path';
import { getRepository, getCustomRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import uploadConfig from '../config/upload';
import AppError from '../errors/AppError';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  fileName: string;
}

interface CsvTransactionFormat {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute({ fileName }: Request): Promise<Transaction[]> {
    const csvFilePath = path.join(uploadConfig.directory, fileName);
    const data = await fs.promises.readFile(csvFilePath, 'utf8');

    if (!data) {
      throw new AppError('Arquivo zuado');
    }

    const transationsToCreate = data.split('\n');

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);
    const newTransations: CsvTransactionFormat[] = [];
    const categories: string[] = [];

    transationsToCreate.slice(1).map(transationToCreate => {
      const [title, type, value, category] = transationToCreate.split(',');

      if (title && type && value && category) {
        newTransations.push({
          title: title.trim(),
          type: type.trim() === 'outcome' ? 'outcome' : 'income',
          value: parseFloat(value.trim()),
          category: category.trim(),
        });

        categories.push(category.trim());
      }
    });

    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const toBeAddedCategories = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryRepository.create(
      toBeAddedCategories.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);

    const allCategories = [...existentCategories, ...newCategories];
    const createdTransactions = transactionsRepository.create(
      newTransations.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );
    await transactionsRepository.save(createdTransactions);
    await fs.promises.unlink(csvFilePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;

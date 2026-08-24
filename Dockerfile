FROM php:8.2-apache

# Enable URL rewrite
RUN a2enmod rewrite

# Install PHP extensions
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Copy project files
COPY . /var/www/html/

# Permissions
RUN chown -R www-data:www-data /var/www/html

WORKDIR /var/www/html

EXPOSE 80

CMD ["apache2-foreground"]
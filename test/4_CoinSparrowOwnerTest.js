import
{
  increaseTimeTo,
  duration,
}
  from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMRevert from './helpers/EVMRevert';

const BigNumber = web3.BigNumber;

const Hashids = require('hashids');
const hashids = new Hashids('some salting', 16);

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const CoinSparrow = artifacts.require('CoinSparrow');

contract('CoinSparrow', function ([_owner, _hirer, _contractor,
  _newArbitrator, _withdrawAccount, _,
]) {
  let jobNum = 1000000000;
  let _jobId = hashids.encode(jobNum);
  const _value = new web3.BigNumber(web3.toWei(0.2, 'ether'));
  const _fee = _value.mul(0.01);
  const _jobStartWindow = 600;
  const MAX_SEND = 3;

  beforeEach(async function () {
    this.startTime = latestTime();
    this.agreedSecondsToComplete = duration.days(1);
    this.coinSparrow = await CoinSparrow.new(new web3.BigNumber(
      web3.toWei(MAX_SEND, 'ether')),
    {
      from: _owner,
    });
    jobNum++;
    //    _jobId = web3.fromAscii(hashids.encode(jobNum));
    _jobId = hashids.encode(jobNum);
    // console.log(_jobId);
  });

  /*
   * Owner Specific
   */
  describe('Owner Only Specific Functionality', function () {
    it('Only owner can add Abitrator', async function () {
      await this.coinSparrow.addArbitrator(_newArbitrator,
        {
          from: _hirer,
        })
        .should.be.rejected;
      await this.coinSparrow.addArbitrator(_newArbitrator,
        {
          from: _owner,
        })
        .should.be.fulfilled;
    });

    it('Only owner can remove Abitrator', async function () {
      await this.coinSparrow.addArbitrator(_newArbitrator,
        {
          from: _owner,
        })
        .should.be.fulfilled;
      await this.coinSparrow.deleteArbitrator(
        _newArbitrator,
        {
          from: _hirer,
        })
        .should.be.rejected;
      await this.coinSparrow.deleteArbitrator(
        _newArbitrator,
        {
          from: _owner,
        })
        .should.be.fulfilled;
    });

    it('Only owner can add Withdraw Wallet', async function () {
      await this.coinSparrow.addApprovedWalletAddress(
        _withdrawAccount,
        {
          from: _hirer,
        })
        .should.be.rejected;
      await this.coinSparrow.addApprovedWalletAddress(
        _withdrawAccount,
        {
          from: _owner,
        })
        .should.be.fulfilled;
    });

    it('Only owner can remove Withdraw Wallet', async function () {
      await this.coinSparrow.addApprovedWalletAddress(
        _withdrawAccount,
        {
          from: _owner,
        })
        .should.be.fulfilled;
      await this.coinSparrow.deleteApprovedWalletAddress(
        _withdrawAccount,
        {
          from: _hirer,
        })
        .should.be.rejected;
      await this.coinSparrow.deleteApprovedWalletAddress(
        _withdrawAccount,
        {
          from: _owner,
        })
        .should.be.fulfilled;
    });

    it(
      'Only owner can transfer available fees to another account',
      async function () {
        await this.coinSparrow.addApprovedWalletAddress(
          _withdrawAccount,
          {
            from: _owner,
          })
          .should.be.fulfilled;

        await this.coinSparrow.createJobEscrow(_jobId,
          _hirer, _contractor, _value, _fee,
          _jobStartWindow, this.agreedSecondsToComplete,
          {
            from: _hirer,
            value: _value,
          });

        await this.coinSparrow.jobStarted(_jobId, _hirer,
          _contractor, _value, _fee,
          {
            from: _contractor,
          });

        await this.coinSparrow.hirerReleaseFunds(_jobId,
          _hirer, _contractor, _value, _fee,
          {
            from: _hirer,
          });

        await this.coinSparrow.withdrawFees(
          _withdrawAccount, _fee,
          {
            from: _hirer,
          })
          .should.be.rejected;
        await this.coinSparrow.withdrawFees(
          _withdrawAccount, _fee,
          {
            from: _owner,
          })
          .should.be.fulfilled;
      });

    it('Can only withdraw available amount', async function () {
      await this.coinSparrow.addApprovedWalletAddress(
        _withdrawAccount,
        {
          from: _owner,
        })
        .should.be.fulfilled;
      await this.coinSparrow.createJobEscrow(_jobId,
        _hirer, _contractor, _value, _fee,
        _jobStartWindow, this.agreedSecondsToComplete,
        {
          from: _hirer,
          value: _value,
        });

      await this.coinSparrow.jobStarted(_jobId, _hirer,
        _contractor, _value, _fee,
        {
          from: _contractor,
        });

      await this.coinSparrow.hirerReleaseFunds(_jobId,
        _hirer, _contractor, _value, _fee,
        {
          from: _hirer,
        });

      await this.coinSparrow.withdrawFees(
        _withdrawAccount, _fee,
        {
          from: _owner,
        })
        .should.be.fulfilled;
      await this.coinSparrow.withdrawFees(
        _withdrawAccount, _fee,
        {
          from: _owner,
        })
        .should.be.rejectedWith(EVMRevert);
    });

    it('Only owner can set MAX_SEND', async function () {
      await this.coinSparrow.setMaxSend(new web3.BigNumber(
        web3.toWei(10, 'ether')),
      {
        from: _owner,
      })
        .should.be.fulfilled;
      await this.coinSparrow.setMaxSend(new web3.BigNumber(
        web3.toWei(10, 'ether')),
      {
        from: _hirer,
      })
        .should.be.rejectedWith(EVMRevert);
      await this.coinSparrow.setMaxSend(new web3.BigNumber(
        web3.toWei(10, 'ether')),
      {
        from: 0x0,
      })
        .should.be.rejected;
    });
  });

  describe('Arbitrator Sub Contract functions', function () {
    it('Owner address cannot be removed', async function () {
      await this.coinSparrow.deleteArbitrator(_owner,
        {
          from: _hirer,
        })
        .should.be.rejected;
    });

    it('cannot add invalid address', async function () {
      await this.coinSparrow.addArbitrator(0x0,
        {
          from: _owner,
        })
        .should.be.rejected;
    });

    it('cannot delete invalid address', async function () {
      await this.coinSparrow.deleteArbitrator(0x0,
        {
          from: _owner,
        })
        .should.be.rejected;
    });

    it('Check valid arbitrator', async function () {
      let res1 = await this.coinSparrow.isArbitrator.call(_owner);
      res1.should.be.equal(true);

      let res2 = await this.coinSparrow.isArbitrator.call(_hirer)
      res2.should.be.equal(false);

      await this.coinSparrow.addArbitrator(_newArbitrator,
        {
          from: _owner,
        })
        .should.be.fulfilled;

      let res3 = await this.coinSparrow.isArbitrator.call(_newArbitrator)
      res3.should.be.equal(true);
    });
  });

  describe('ApprovedWithdrawer Sub Contract functions', function () {
    it('Owner address cannot be removed', async function () {
      await this.coinSparrow.deleteApprovedWalletAddress(
        _owner,
        {
          from: _hirer,
        })
        .should.be.rejected;
    });

    it('cannot add invalid address', async function () {
      await this.coinSparrow.addApprovedWalletAddress(0x0,
        {
          from: _hirer,
        })
        .should.be.rejected;
    });

    it('cannot delete invalid address', async function () {
      await this.coinSparrow.deleteApprovedWalletAddress(
        0x0,
        {
          from: _hirer,
        })
        .should.be.rejected;
    });

    it('Check approved wallet', async function () {
      let res1 = await this.coinSparrow.isApprovedWallet.call(_owner);
      res1.should.be.equal(true);

      let res2 = await this.coinSparrow.isApprovedWallet.call(_hirer)
      res2.should.be.equal(false);

      await this.coinSparrow.addApprovedWalletAddress(_newArbitrator,
        {
          from: _owner,
        })
        .should.be.fulfilled;

      let res3 = await this.coinSparrow.isApprovedWallet.call(_newArbitrator)
      res3.should.be.equal(true);
    });
  });
});
